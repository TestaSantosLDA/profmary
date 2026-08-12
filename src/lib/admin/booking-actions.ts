"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  notifyAdminCancelled,
  notifyDecision,
} from "@/lib/email/notifications";
import { syncPendingBookings } from "@/lib/gcal/sync";
import { emitBookingEvent } from "@/lib/messages/events";
import { refundPackCredit } from "@/lib/packs/refund";
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
    .select("id, status, starts_at, price_estimate_cents, paid_with_pack_purchase_id")
    .eq("id", id)
    .single();

  if (!booking || booking.status !== "pending") {
    return { error: "not_pending", success: false };
  }
  if (new Date(booking.starts_at) <= new Date()) {
    return { error: "in_past", success: false };
  }

  let price = booking.price_estimate_cents;
  // Pack lessons stay at 0 whatever the distance — travel is included.
  if (applyTravelFee && !booking.paid_with_pack_purchase_id) {
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
      travel_fee_applied: applyTravelFee && !booking.paid_with_pack_purchase_id,
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
  after(() => emitBookingEvent("booking_confirmed", id));
  after(() => syncPendingBookings());

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

  const { error, data } = await supabase
    .from("bookings")
    .update({ status: "declined", admin_note: note || null })
    .eq("id", id)
    .eq("status", "pending")
    .select("paid_with_pack_purchase_id");

  if (error || !data || data.length === 0) {
    return { error: "save_failed", success: false };
  }

  // A declined request was never a lesson: the credit returns automatically.
  if (data[0].paid_with_pack_purchase_id) {
    await refundPackCredit(id, "pedido recusado");
  }

  after(() => notifyDecision("booking", id, "declined"));
  after(() => emitBookingEvent("booking_declined", id));

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
  after(() => syncPendingBookings());

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
    .select("id, status, gcal_event_id, paid_with_pack_purchase_id")
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

  // Pending pack requests refund automatically; a cancelled *confirmed*
  // pack lesson goes to the resolution panel — Maria's call, every time.
  if (booking.status === "pending" && booking.paid_with_pack_purchase_id) {
    await refundPackCredit(id, "pedido cancelado");
  }

  after(() => notifyAdminCancelled(id));
  after(() => emitBookingEvent("booking_cancelled", id));
  after(() => syncPendingBookings());

  revalidatePath("/", "layout");
  return { error: null, success: true };
}
