import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, OAUTH_STATE_COOKIE } from "@/lib/gcal/client";
import { encryptToken } from "@/lib/gcal/crypto";
import { syncPendingBookings } from "@/lib/gcal/sync";
import { createClient } from "@/lib/supabase/server";

// Google redirects here after the admin consents to calendar access.
// Exchanges the code for a refresh token and stores it encrypted in settings.
export async function GET(request: NextRequest) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const [nonce, locale = "pt"] = (searchParams.get("state") ?? "").split(":");

  const settingsUrl = (query: string) =>
    NextResponse.redirect(`${site}/${locale === "en" ? "en" : "pt"}/admin/settings?${query}`);

  const cookieStore = await cookies();
  const expectedNonce = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!code || !nonce || nonce !== expectedNonce) {
    return settingsUrl("gcal_error=state");
  }

  // Only a signed-in admin may complete the connection; RLS on settings
  // enforces the same at the data layer.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return settingsUrl("gcal_error=auth");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return settingsUrl("gcal_error=auth");
  }

  try {
    const refreshToken = await exchangeCode(code);
    if (!refreshToken) {
      return settingsUrl("gcal_error=no_token");
    }
    const { error } = await supabase
      .from("settings")
      .update({
        gcal_refresh_token: encryptToken(refreshToken),
        gcal_sync_error: null,
      })
      .eq("id", true);
    if (error) {
      return settingsUrl("gcal_error=save");
    }
  } catch (err) {
    console.error("[gcal] connect failed:", err);
    return settingsUrl("gcal_error=exchange");
  }

  // Push anything that queued up while disconnected.
  after(() => syncPendingBookings());

  return settingsUrl("gcal=connected");
}
