"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyNewMessage } from "@/lib/email/notifications";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateConversation } from "./queries";

export type MessageActionState = { error: string | null };

const MAX_BODY_LENGTH = 4000;

/**
 * Students always write into their own thread (created on first send);
 * Maria names the conversation she is answering. RLS re-checks both sides.
 */
export async function sendMessage(
  _prev: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const body = String(formData.get("body") ?? "").trim();
  const adminConversationId = String(formData.get("conversation_id") ?? "");

  if (!body) return { error: "empty" };
  if (body.length > MAX_BODY_LENGTH) return { error: "too_long" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const asTeacher = !!profile?.is_admin && adminConversationId !== "";
  let conversationId = adminConversationId;
  if (!asTeacher) {
    const own = await getOrCreateConversation(user.id);
    if (!own) return { error: "save_failed" };
    conversationId = own;
  }

  const { data: created, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_type: asTeacher ? "teacher" : "student",
      sender_user_id: user.id,
      body,
    })
    .select("id")
    .single();

  if (error || !created) return { error: "save_failed" };

  after(() => notifyNewMessage(created.id));

  revalidatePath("/", "layout");
  return { error: null };
}

/** The 5-minute window and authorship live in the database function. */
export async function editMessage(
  _prev: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!id || !body) return { error: "empty" };
  if (body.length > MAX_BODY_LENGTH) return { error: "too_long" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("edit_message", {
    p_message_id: id,
    p_body: body,
  });

  if (error || data !== "ok") {
    return { error: typeof data === "string" ? data : "save_failed" };
  }

  revalidatePath("/", "layout");
  return { error: null };
}

/** Clears the caller's unread counter; the thread calls it on open. */
export async function markConversationRead(
  conversationId: string
): Promise<void> {
  if (!conversationId) return;
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });
  revalidatePath("/", "layout");
}
