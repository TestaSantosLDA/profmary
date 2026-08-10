import { NextResponse, type NextRequest } from "next/server";
import { sendReminder } from "@/lib/email/notifications";
import { createServiceClient } from "@/lib/supabase/server";

// Hourly scheduled work, invoked by the GitHub Actions cron workflow.
// Idempotent by design: materialization starts after the latest existing
// occurrence; reminders (group 7) and calendar sync retries (group 8) will
// hang off this same endpoint.
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: materialized, error } = await supabase.rpc(
    "materialize_series",
    { p_window_months: Number(process.env.BOOKING_WINDOW_MONTHS ?? 3) }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 24h reminders: claim rows first (sets reminder_sent_at) so a rerun can
  // never double-send, then send. A send failure after claiming is accepted
  // rather than risking duplicates.
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data: claimed } = await supabase
    .from("bookings")
    .update({ reminder_sent_at: now.toISOString() })
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gt("starts_at", now.toISOString())
    .lte("starts_at", windowEnd.toISOString())
    .select("id");

  for (const row of claimed ?? []) {
    await sendReminder(row.id);
  }

  return NextResponse.json({
    materialized,
    reminders: (claimed ?? []).length,
  });
}
