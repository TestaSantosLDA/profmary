"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  notifyAdminCancelled,
  notifyDecision,
} from "@/lib/email/notifications";
import { createClient } from "@/lib/supabase/server";
import type { AdminActionState } from "./services-actions";

export async function approveBooking(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = String(formData.get("id") ?? "");
  const applyTravelFee = formData.get("travel_fee") === "on";
  const note = String(formData.get("note") ?? "").trim();

  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, starts_at, price_estimate_cents")
    .eq("id", id)
    .single();

  if (!booking || booking.status !== "pending") {
    return { error: "not_pending", success: false };
  }
  if (new Date(booking.starts_at) <= new Date()) {
    return { error: "in_past", success: false };
  }

  let price = booking.price_estimate_cents;
  if (applyTravelFee) {
    const { data: settings } = await supabase
      .from("settings")
      .select("travel_fee_cents")
      .single();
    price += settings?.travel_fee_cents ?? 0;
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      travel_fee_applied: applyTravelFee,
      admin_note: note || null,
      price_estimate_cents: price,
      gcal_sync_pending: true,
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    return { error: "save_failed", success: false };
  }

  after(() => notifyDecision("booking", id, "confirmed"));
  // TODO(group 8): push event to Google Calendar.

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function declineBooking(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const supabase = await createClient();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "declined", admin_note: note || null })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    return { error: "save_failed", success: false };
  }

  after(() => notifyDecision("booking", id, "declined"));

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function approveSeries(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("approve_series", {
    p_series_id: id,
  });

  if (error || data !== "ok") {
    return { error: data ?? "save_failed", success: false };
  }

  after(() => notifyDecision("series", id, "confirmed"));
  // TODO(group 8): calendar events are created by the sync job (gcal_sync_pending).

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function declineSeries(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("decline_series", {
    p_series_id: id,
  });

  if (error || data !== "ok") {
    return { error: data ?? "save_failed", success: false };
  }

  after(() => notifyDecision("series", id, "declined"));

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function adminCancelBooking(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, gcal_event_id")
    .eq("id", id)
    .single();

  if (!booking || !["pending", "confirmed"].includes(booking.status)) {
    return { error: "not_cancellable", success: false };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled_admin",
      admin_note: note || null,
      gcal_sync_pending: booking.gcal_event_id !== null,
    })
    .eq("id", id);

  if (error) {
    return { error: "save_failed", success: false };
  }

  after(() => notifyAdminCancelled(id));
  // TODO(group 8): delete Google Calendar event.

  revalidatePath("/", "layout");
  return { error: null, success: true };
}
