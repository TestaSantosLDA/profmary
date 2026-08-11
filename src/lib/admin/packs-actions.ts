"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { notifyPackDecision } from "@/lib/email/notifications";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { AdminActionState } from "./services-actions";

function expiryFrom(confirmedAt: Date, months: number | null): string | null {
  if (months === null) return null;
  const expires = new Date(confirmedAt);
  expires.setMonth(expires.getMonth() + months);
  return expires.toISOString();
}

/**
 * Activation is the act that starts the validity clock, and it is only
 * legitimate once Maria was actually paid — the checkbox is enforced here,
 * not just in the UI.
 */
export async function activatePackPurchase(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = String(formData.get("id") ?? "");
  if (formData.get("payment_received") !== "on") {
    return { error: "payment_not_confirmed", success: false };
  }

  const supabase = await createClient();
  const { data: purchase } = await supabase
    .from("pack_purchases")
    .select("id, status, lessons_total, validity_months")
    .eq("id", id)
    .maybeSingle();

  if (!purchase || purchase.status !== "requested") {
    return { error: "not_requested", success: false };
  }

  const confirmedAt = new Date();
  const { error } = await supabase
    .from("pack_purchases")
    .update({
      status: "active",
      confirmed_at: confirmedAt.toISOString(),
      expires_at: expiryFrom(confirmedAt, purchase.validity_months),
    })
    .eq("id", id)
    .eq("status", "requested");

  if (error) {
    return { error: "save_failed", success: false };
  }

  // Opening credit; RLS restricts ledger inserts to admins.
  const { error: ledgerError } = await supabase.from("pack_ledger").insert({
    pack_purchase_id: id,
    delta_lessons: purchase.lessons_total,
    reason: "purchase",
  });
  if (ledgerError) {
    return { error: "save_failed", success: false };
  }

  after(() => notifyPackDecision(id, "active"));

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function declinePackPurchase(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  const { error, data } = await supabase
    .from("pack_purchases")
    .update({ status: "declined" })
    .eq("id", id)
    .eq("status", "requested")
    .select("id");

  if (error || !data || data.length === 0) {
    return { error: "save_failed", success: false };
  }

  after(() => notifyPackDecision(id, "declined"));

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

/**
 * Ficha "Atribuir pack": a pack agreed offline becomes active immediately —
 * Maria granting it IS the payment confirmation.
 */
export async function grantPack(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const accountId = String(formData.get("account_id") ?? "");
  const packId = String(formData.get("pack_id") ?? "");

  // Admin gate: this runs on the service client, so check explicitly.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
    : { data: null };
  if (!me?.is_admin) {
    return { error: "save_failed", success: false };
  }

  const service = createServiceClient();
  const { data: pack } = await service
    .from("packs")
    .select("id, service_id, lessons, price_per_lesson_cents, validity_months")
    .eq("id", packId)
    .maybeSingle();

  if (!pack) {
    return { error: "save_failed", success: false };
  }

  const confirmedAt = new Date();
  const { data: created, error } = await service
    .from("pack_purchases")
    .insert({
      account_id: accountId,
      pack_id: pack.id,
      service_id: pack.service_id,
      lessons_total: pack.lessons,
      price_per_lesson_cents: pack.price_per_lesson_cents,
      price_paid_cents: pack.lessons * pack.price_per_lesson_cents,
      validity_months: pack.validity_months,
      status: "active",
      confirmed_at: confirmedAt.toISOString(),
      expires_at: expiryFrom(confirmedAt, pack.validity_months),
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: "save_failed", success: false };
  }

  await service.from("pack_ledger").insert({
    pack_purchase_id: created.id,
    delta_lessons: pack.lessons,
    reason: "purchase",
    note: "atribuído na ficha",
  });

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

/**
 * Maria's decision for a cancelled pack lesson: return the credit, consume
 * it, or return it with a warning on record. No automatic rule, ever; each
 * choice lands in the ledger so the balance stays explainable.
 */
export async function resolvePackCancellation(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const bookingId = String(formData.get("booking_id") ?? "");
  const resolution = String(formData.get("resolution") ?? "");
  if (!["refund", "consume", "refund_warning"].includes(resolution)) {
    return { error: "save_failed", success: false };
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("pack_ledger")
    .select("pack_purchase_id, reason")
    .eq("booking_id", bookingId);

  const spend = (rows ?? []).find((r) => r.reason === "lesson");
  const resolved = (rows ?? []).some(
    (r) => r.reason === "cancel_refund" || r.reason === "cancel_consume"
  );
  if (!spend || resolved) {
    return { error: "already_resolved", success: false };
  }

  // User-client insert: the admins-only RLS policy is the authorisation.
  const { error } = await supabase.from("pack_ledger").insert({
    pack_purchase_id: spend.pack_purchase_id,
    booking_id: bookingId,
    delta_lessons: resolution === "consume" ? 0 : 1,
    reason: resolution === "consume" ? "cancel_consume" : "cancel_refund",
    note: resolution === "refund_warning" ? "aviso" : null,
  });

  if (error) {
    return { error: "save_failed", success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}
