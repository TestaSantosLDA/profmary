import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import {
  GcalAuthError,
  deleteEvent,
  getAccessToken,
  insertEvent,
} from "./client";
import { decryptToken } from "./crypto";

// Statuses whose calendar event must be removed.
const DELETE_STATUSES = new Set([
  "cancelled_student",
  "cancelled_admin",
  "skipped_blockout",
]);

export type SyncResult = {
  synced: number;
  failed: number;
  disconnected: boolean;
};

const NOOP: SyncResult = { synced: 0, failed: 0, disconnected: false };

type PendingRow = {
  id: string;
  status: string;
  gcal_event_id: string | null;
  starts_at: string;
  ends_at: string;
  address: string;
  attendee_names: string[];
  services: { title_pt: string } | null;
  profiles: { name: string } | null;
};

/**
 * Pushes every booking flagged `gcal_sync_pending` to Google Calendar:
 * confirmed rows gain an event, cancelled/skipped rows lose theirs.
 *
 * Called fire-and-forget after booking transitions and from the hourly cron
 * (which is the retry path). Sync must never break a booking action, so this
 * never throws. Rows are claimed first (flag cleared) like the reminder job,
 * so concurrent runs cannot double-insert; a failed row gets its flag back
 * for the next pass.
 */
export async function syncPendingBookings(): Promise<SyncResult> {
  try {
    return await run();
  } catch (err) {
    console.error("[gcal] sync pass crashed:", err);
    return { ...NOOP, failed: 1 };
  }
}

async function run(): Promise<SyncResult> {
  const supabase = createServiceClient();

  const { data: settings } = await supabase
    .from("settings")
    .select("gcal_refresh_token, gcal_sync_error")
    .single();

  // Not connected (or already flagged as broken): nothing to push.
  if (!settings?.gcal_refresh_token) return NOOP;

  let accessToken: string;
  try {
    accessToken = await getAccessToken(decryptToken(settings.gcal_refresh_token));
  } catch (err) {
    if (err instanceof GcalAuthError) {
      await markDisconnected(supabase);
      return { ...NOOP, disconnected: true };
    }
    console.error("[gcal] token refresh failed:", err);
    return { ...NOOP, failed: 1 };
  }

  const { data: claimed } = await supabase
    .from("bookings")
    .update({ gcal_sync_pending: false })
    .eq("gcal_sync_pending", true)
    .select(
      "id, status, gcal_event_id, starts_at, ends_at, address, attendee_names, services(title_pt), profiles(name)"
    );

  let synced = 0;
  let failed = 0;

  for (const row of (claimed ?? []) as unknown as PendingRow[]) {
    try {
      if (row.status === "confirmed" && !row.gcal_event_id) {
        const eventId = await insertEvent(accessToken, {
          summary: `Aula: ${row.services?.title_pt ?? "?"} — ${row.profiles?.name ?? "?"}`,
          location: row.address,
          description: `Alunos: ${row.attendee_names.join(", ")}`,
          startIso: row.starts_at,
          endIso: row.ends_at,
        });
        await supabase
          .from("bookings")
          .update({ gcal_event_id: eventId })
          .eq("id", row.id);
        synced += 1;
      } else if (DELETE_STATUSES.has(row.status) && row.gcal_event_id) {
        await deleteEvent(accessToken, row.gcal_event_id);
        await supabase
          .from("bookings")
          .update({ gcal_event_id: null })
          .eq("id", row.id);
        synced += 1;
      }
      // Any other combination has nothing to push; the claim cleared its flag.
    } catch (err) {
      console.error(`[gcal] sync failed for booking ${row.id}:`, err);
      await supabase
        .from("bookings")
        .update({ gcal_sync_pending: true })
        .eq("id", row.id);
      failed += 1;
      if (err instanceof GcalAuthError) {
        await markDisconnected(supabase);
        return { synced, failed, disconnected: true };
      }
    }
  }

  // Auth worked this pass — clear a stale "broken connection" flag.
  if (settings.gcal_sync_error) {
    await supabase
      .from("settings")
      .update({ gcal_sync_error: null })
      .eq("id", true);
  }

  return { synced, failed, disconnected: false };
}

async function markDisconnected(
  supabase: ReturnType<typeof createServiceClient>
): Promise<void> {
  await supabase
    .from("settings")
    .update({ gcal_refresh_token: null, gcal_sync_error: "revoked" })
    .eq("id", true);
}
