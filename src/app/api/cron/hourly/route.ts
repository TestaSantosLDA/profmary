import { NextResponse, type NextRequest } from "next/server";
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

  return NextResponse.json({ materialized });
}
