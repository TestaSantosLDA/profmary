import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

/**
 * Automatic refund for a pack booking that died before it was ever a real
 * lesson (declined, or cancelled while still pending). Confirmed
 * cancellations are deliberately NOT refunded here — that decision is
 * Maria's, made in the admin panel, every time.
 *
 * Idempotent: refunds only when a spend row exists and no resolution row
 * (refund or consume) has been written yet.
 */
export async function refundPackCredit(
  bookingId: string,
  note: string
): Promise<void> {
  const supabase = createServiceClient();

  const { data: rows } = await supabase
    .from("pack_ledger")
    .select("pack_purchase_id, reason")
    .eq("booking_id", bookingId);

  const spend = (rows ?? []).find((r) => r.reason === "lesson");
  const resolved = (rows ?? []).some(
    (r) => r.reason === "cancel_refund" || r.reason === "cancel_consume"
  );
  if (!spend || resolved) return;

  await supabase.from("pack_ledger").insert({
    pack_purchase_id: spend.pack_purchase_id,
    booking_id: bookingId,
    delta_lessons: 1,
    reason: "cancel_refund",
    note,
  });
}
