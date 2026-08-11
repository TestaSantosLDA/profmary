import "server-only";

// Thin fetch wrapper over the two Google endpoints we use (OAuth token and
// Calendar events). The googleapis SDK would add ~10 MB for these 4 calls.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/** The grant was revoked or expired — reconnecting is the only fix. */
export class GcalAuthError extends Error {}

export const OAUTH_STATE_COOKIE = "gcal_oauth_state";

export function oauthRedirectUri(): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/api/gcal/callback`;
}

export function consentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: oauthRedirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    // offline + consent force Google to issue a refresh token every time.
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string): Promise<string | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: oauthRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`gcal code exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { refresh_token?: string };
  return json.refresh_token ?? null;
}

export async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 400 && body.includes("invalid_grant")) {
      throw new GcalAuthError(body);
    }
    throw new Error(`gcal token refresh failed: ${res.status} ${body}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export type GcalEvent = {
  summary: string;
  location: string;
  description: string;
  startIso: string;
  endIso: string;
};

export async function insertEvent(
  accessToken: string,
  event: GcalEvent
): Promise<string> {
  const res = await fetch(EVENTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.summary,
      location: event.location,
      description: event.description,
      start: { dateTime: event.startIso, timeZone: "Europe/Lisbon" },
      end: { dateTime: event.endIso, timeZone: "Europe/Lisbon" },
    }),
  });
  if (res.status === 401 || res.status === 403) {
    throw new GcalAuthError(await res.text());
  }
  if (!res.ok) {
    throw new Error(`gcal event insert failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { id: string };
  return json.id;
}

export async function deleteEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const res = await fetch(`${EVENTS_URL}/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401 || res.status === 403) {
    throw new GcalAuthError(await res.text());
  }
  // 404/410: already gone — deletion is idempotent from our side.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`gcal event delete failed: ${res.status} ${await res.text()}`);
  }
}
