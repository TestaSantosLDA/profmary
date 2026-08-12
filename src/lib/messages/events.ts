import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { getOrCreateConversation, type ConversationEventType } from "./queries";

/**
 * Booking activity rendered inside the thread as context pills. The payload
 * snapshots what the line shows (start, mode) at emit time, so a later
 * reschedule or edit never rewrites the thread's history. Failures are
 * swallowed — an event line must never break a booking action.
 */
export async function emitBookingEvent(
  eventType: Exclude<ConversationEventType, "pack_activated">,
  bookingId: string
): Promise<void> {
  try {
    const service = createServiceClient();
    const { data: booking } = await service
      .from("bookings")
      .select("user_id, starts_at, mode")
      .eq("id", bookingId)
      .single();
    if (!booking) return;

    const conversationId = await getOrCreateConversation(booking.user_id);
    if (!conversationId) return;

    await service.from("messages").insert({
      conversation_id: conversationId,
      kind: "event",
      event_type: eventType,
      event_payload: { starts_at: booking.starts_at, mode: booking.mode },
      booking_id: bookingId,
    });
  } catch (err) {
    console.error("[messages] emitBookingEvent failed:", err);
  }
}

/** Pack activation event — the only non-booking context pill. */
export async function emitPackActivated(packPurchaseId: string): Promise<void> {
  try {
    const service = createServiceClient();
    const { data: purchase } = await service
      .from("pack_purchases")
      .select("account_id, lessons_total")
      .eq("id", packPurchaseId)
      .single();
    if (!purchase) return;

    const conversationId = await getOrCreateConversation(purchase.account_id);
    if (!conversationId) return;

    await service.from("messages").insert({
      conversation_id: conversationId,
      kind: "event",
      event_type: "pack_activated",
      event_payload: { lessons: purchase.lessons_total },
      pack_purchase_id: packPurchaseId,
    });
  } catch (err) {
    console.error("[messages] emitPackActivated failed:", err);
  }
}
