"use server";

import { fromZonedTime } from "date-fns-tz";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "@/i18n/navigation";
import {
  notifyRequestReceived,
  notifyStudentCancelled,
} from "@/lib/email/notifications";
import { spendablePurchase } from "@/lib/packs/queries";
import { refundPackCredit } from "@/lib/packs/refund";
import { syncPendingBookings } from "@/lib/gcal/sync";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAvailableSlots } from "./queries";
import {
  estimatePriceCents,
  LESSON_TIMEZONE,
  onsiteFeeCents,
  type DaySlots,
  type LessonMode,
  type OnsiteFeeSettings,
} from "./slots";

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
  const mode = String(formData.get("mode") ?? "") as LessonMode;
  // Online lessons have no address; the meeting link is emailed on approval.
  const address =
    mode === "onsite" ? String(formData.get("address") ?? "").trim() : "";
  const attendees = formData
    .getAll("attendee_names")
    .map((n) => String(n).trim())
    .filter(Boolean);

  if (!serviceId || !date || !start || !duration) {
    return { error: "missing_fields" };
  }
  if (mode !== "online" && mode !== "onsite") {
    return { error: "invalid_mode" };
  }
  if (mode === "onsite" && !address) {
    return { error: "missing_address" };
  }
  if (attendees.length === 0) {
    return { error: "missing_attendees" };
  }

  const { data: service } = await supabase
    .from("services")
    .select(
      "hourly_rate_cents, attendee_cap, active, allows_online, allows_onsite, onsite_fee_override_cents"
    )
    .eq("id", serviceId)
    .single();

  if (!service || !service.active) {
    return { error: "unknown_service" };
  }
  if (
    (mode === "online" && !service.allows_online) ||
    (mode === "onsite" && !service.allows_onsite)
  ) {
    return { error: "invalid_mode" };
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

  // Pack lessons: one credit whatever the duration, money total 0, travel
  // included. Draw on the soonest-expiring live purchase for this service.
  const usePack = formData.get("use_pack") === "on";
  const packPurchase = usePack
    ? await spendablePurchase(user.id, serviceId)
    : null;
  if (usePack && !packPurchase) {
    return { error: "pack_empty" };
  }

  // Weekly recurring: the series function inserts every occurrence
  // atomically — any slot conflict in the window rejects the whole request.
  if (formData.get("recurring") === "on") {
    const endDate = String(formData.get("end_date") ?? "").trim();
    const { data, error: rpcError } = await supabase.rpc(
      "create_booking_series",
      {
        p_service_id: serviceId,
        p_first_date: date,
        p_start_time: start,
        p_duration_minutes: duration,
        p_attendee_names: attendees,
        p_address: address,
        p_mode: mode,
        p_end_date: endDate || null,
        p_window_months: Number(process.env.BOOKING_WINDOW_MONTHS ?? 3),
        // Credits are spent per occurrence by the hourly job as lessons
        // happen — never reserved for the whole series up front.
        p_pack_purchase_id: packPurchase?.id ?? null,
      }
    );

    if (rpcError) {
      return { error: "save_failed" };
    }
    if (data?.error) {
      return { error: data.error };
    }

    after(() => notifyRequestReceived("series", data.series_id));

    revalidatePath("/", "layout");
    const seriesLocale = await getLocale();
    redirect({ href: "/dashboard?requested=1", locale: seriesLocale });
    return { error: null }; // unreachable — redirect throws
  }

  const startsAt = fromZonedTime(`${date}T${start}:00`, LESSON_TIMEZONE);
  const endsAt = new Date(startsAt.getTime() + duration * 60_000);

  // Fee snapshot at request time; later settings changes never touch it.
  const { data: feeSettings } = await supabase
    .rpc("get_public_settings")
    .single<OnsiteFeeSettings>();
  const fee =
    mode === "onsite" && !packPurchase
      ? onsiteFeeCents(service.onsite_fee_override_cents, feeSettings, duration)
      : 0;

  const { data: created, error } = await supabase
    .from("bookings")
    .insert({
      user_id: user.id,
      service_id: serviceId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      // buffered_until is overwritten by the DB trigger; a placeholder keeps
      // the not-null column satisfied at parse time.
      buffered_until: endsAt.toISOString(),
      attendee_names: attendees,
      address,
      mode,
      onsite_fee_applied_cents: fee,
      paid_with_pack_purchase_id: packPurchase?.id ?? null,
      price_estimate_cents: packPurchase
        ? 0
        : estimatePriceCents(
            service.hourly_rate_cents,
            duration,
            attendees.length
          ) + fee,
    })
    .select("id")
    .single();

  if (error || !created) {
    // 23P01 = exclusion constraint: someone soft-held the slot first.
    return { error: error?.code === "23P01" ? "slot_taken" : "save_failed" };
  }

  // Single lessons spend their credit at request time — the form's "ficam
  // N aulas" line is a promise, and the overdraft check on the purchase
  // makes a concurrent last-credit race an insert failure here.
  if (packPurchase) {
    const serviceClient = createServiceClient();
    const { error: spendError } = await serviceClient.from("pack_ledger").insert({
      pack_purchase_id: packPurchase.id,
      booking_id: created.id,
      delta_lessons: -1,
      reason: "lesson",
    });
    if (spendError) {
      await serviceClient.from("bookings").delete().eq("id", created.id);
      return { error: "pack_empty" };
    }
  }

  after(() => notifyRequestReceived("booking", created.id));

  revalidatePath("/", "layout");
  const locale = await getLocale();
  redirect({ href: "/dashboard?requested=1", locale });
  return { error: null }; // unreachable — redirect throws
}

export async function cancelBooking(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // Status before the cancel decides the pack refund: a withdrawn pending
  // request refunds automatically; a cancelled confirmed lesson waits for
  // Maria's decision in the admin panel.
  const { data: before } = await supabase
    .from("bookings")
    .select("status, paid_with_pack_purchase_id")
    .eq("id", id)
    .maybeSingle();

  const { data } = await supabase.rpc("cancel_booking", { p_booking_id: id });

  if (data === "ok") {
    if (before?.status === "pending" && before.paid_with_pack_purchase_id) {
      await refundPackCredit(id, "pedido retirado antes da confirmação");
    }
    after(() => notifyStudentCancelled("booking", id));
    after(() => syncPendingBookings());
    revalidatePath("/", "layout");
  }
}

export async function cancelSeries(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data } = await supabase.rpc("cancel_series", { p_series_id: id });

  if (data === "ok") {
    after(() => notifyStudentCancelled("series", id));
    after(() => syncPendingBookings());
    revalidatePath("/", "layout");
  }
}
