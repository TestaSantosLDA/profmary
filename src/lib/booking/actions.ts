"use server";

import { fromZonedTime } from "date-fns-tz";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAvailableSlots } from "./queries";
import { estimatePriceCents, LESSON_TIMEZONE, type DaySlots } from "./slots";

export type BookingActionState = { error: string | null };

export async function fetchSlots(
  serviceId: string,
  durationMinutes: number
): Promise<DaySlots[] | { error: string }> {
  return getAvailableSlots(serviceId, durationMinutes);
}

export async function createBookingRequest(
  _prev: BookingActionState,
  formData: FormData
): Promise<BookingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "not_authenticated" };
  }

  const serviceId = String(formData.get("service_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start") ?? "");
  const duration = Number(formData.get("duration") ?? 0);
  const address = String(formData.get("address") ?? "").trim();
  const attendees = formData
    .getAll("attendee_names")
    .map((n) => String(n).trim())
    .filter(Boolean);

  if (!serviceId || !date || !start || !duration) {
    return { error: "missing_fields" };
  }
  if (!address) {
    return { error: "missing_address" };
  }
  if (attendees.length === 0) {
    return { error: "missing_attendees" };
  }

  const { data: service } = await supabase
    .from("services")
    .select("hourly_rate_cents, attendee_cap, active")
    .eq("id", serviceId)
    .single();

  if (!service || !service.active) {
    return { error: "unknown_service" };
  }
  if (service.attendee_cap !== -1 && attendees.length > service.attendee_cap) {
    return { error: "too_many_attendees" };
  }

  // Authoritative slot check against rules, blockouts, notice, window, holds.
  const slots = await getAvailableSlots(serviceId, duration);
  if ("error" in slots) {
    return { error: slots.error };
  }
  const day = slots.find((d) => d.date === date);
  if (!day || !day.starts.includes(start)) {
    return { error: "slot_taken" };
  }

  const startsAt = fromZonedTime(`${date}T${start}:00`, LESSON_TIMEZONE);
  const endsAt = new Date(startsAt.getTime() + duration * 60_000);

  const { error } = await supabase.from("bookings").insert({
    user_id: user.id,
    service_id: serviceId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    // buffered_until is overwritten by the DB trigger; a placeholder keeps
    // the not-null column satisfied at parse time.
    buffered_until: endsAt.toISOString(),
    attendee_names: attendees,
    address,
    price_estimate_cents: estimatePriceCents(
      service.hourly_rate_cents,
      duration,
      attendees.length
    ),
  });

  if (error) {
    // 23P01 = exclusion constraint: someone soft-held the slot first.
    return { error: error.code === "23P01" ? "slot_taken" : "save_failed" };
  }

  // TODO(group 7): request-received email to student + alert to admin.

  revalidatePath("/", "layout");
  const locale = await getLocale();
  redirect({ href: "/dashboard?requested=1", locale });
  return { error: null }; // unreachable — redirect throws
}

export async function cancelBooking(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data } = await supabase.rpc("cancel_booking", { p_booking_id: id });

  if (data === "ok") {
    // TODO(group 7): cancellation email to admin.
    revalidatePath("/", "layout");
  }
}

export async function cancelSeries(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data } = await supabase.rpc("cancel_series", { p_series_id: id });

  if (data === "ok") {
    // TODO(group 7): cancellation email to admin.
    revalidatePath("/", "layout");
  }
}
