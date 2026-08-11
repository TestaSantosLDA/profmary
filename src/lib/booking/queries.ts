import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { generateSlots, type DaySlots } from "./slots";

export type BookableService = {
  id: string;
  title_pt: string;
  title_en: string;
  description_pt: string;
  description_en: string;
  hourly_rate_cents: number;
  min_duration_minutes: number;
  max_duration_minutes: number;
  attendee_cap: number;
  allows_online: boolean;
  allows_onsite: boolean;
  onsite_fee_override_cents: number | null;
};

/**
 * Computes available slots for a service/duration. Runs with the service
 * role because rules, blockouts, and other students' holds are not readable
 * under RLS — only the derived, non-sensitive slot list leaves the server.
 */
export async function getAvailableSlots(
  serviceId: string,
  durationMinutes: number
): Promise<DaySlots[] | { error: string }> {
  const supabase = createServiceClient();

  const { data: service } = await supabase
    .from("services")
    .select("min_duration_minutes, max_duration_minutes, active")
    .eq("id", serviceId)
    .single();

  if (!service || !service.active) {
    return { error: "unknown_service" };
  }
  if (
    durationMinutes % 30 !== 0 ||
    durationMinutes < service.min_duration_minutes ||
    durationMinutes > service.max_duration_minutes
  ) {
    return { error: "invalid_duration" };
  }

  const now = new Date();
  const [{ data: rules }, { data: blockouts }, { data: busy }, { data: settings }] =
    await Promise.all([
      supabase.from("availability_rules").select("weekday, start_time, end_time"),
      supabase.from("blockouts").select("start_date, end_date"),
      supabase
        .from("bookings")
        .select("starts_at, buffered_until")
        .in("status", ["pending", "confirmed"])
        .gt("buffered_until", now.toISOString()),
      supabase
        .from("settings")
        .select("buffer_minutes, booking_notice_hours")
        .single(),
    ]);

  if (!settings) {
    return { error: "unavailable" };
  }

  return generateSlots({
    rules: rules ?? [],
    blockouts: blockouts ?? [],
    busy: busy ?? [],
    bufferMinutes: settings.buffer_minutes,
    noticeHours: settings.booking_notice_hours,
    windowMonths: Number(process.env.BOOKING_WINDOW_MONTHS ?? 3),
    durationMinutes,
    now,
  });
}
