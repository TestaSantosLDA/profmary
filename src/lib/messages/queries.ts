import "server-only";

import { createClient, createServiceClient } from "@/lib/supabase/server";

export type MessageKind = "text" | "file" | "image" | "audio" | "event";

export type ConversationEventType =
  | "booking_requested"
  | "booking_confirmed"
  | "booking_declined"
  | "booking_cancelled"
  | "booking_rescheduled"
  | "pack_activated";

export type MessageRow = {
  id: string;
  sender_type: "student" | "teacher" | null;
  sender_user_id: string | null;
  body: string | null;
  kind: MessageKind;
  event_type: ConversationEventType | null;
  event_payload: {
    starts_at?: string;
    mode?: "online" | "onsite";
    lessons?: number;
  } | null;
  created_at: string;
  edited_at: string | null;
  read_at: string | null;
};

export type ConversationListRow = {
  id: string;
  account_id: string;
  last_message_at: string;
  last_message_preview: string | null;
  last_message_sender: "student" | "teacher" | null;
  last_activity_at: string;
  unread_teacher: number;
  pinned: boolean;
  archived: boolean;
  accountName: string;
  /** Ficha names that differ from the account holder ("educanda" sub-line). */
  wardNames: string[];
  /** Hours the student has been waiting; null when Maria spoke last. */
  waitingHours: number | null;
};

/** Overdue threshold: a student waiting longer than this flags red. */
export const OVERDUE_HOURS = 24;

/**
 * One conversation per account, created on first use (first message or first
 * booking event). Reads never create — an account that never wrote and never
 * booked has no row.
 */
export async function getOrCreateConversation(
  accountId: string
): Promise<string | null> {
  const service = createServiceClient();

  const { data: existing } = await service
    .from("conversations")
    .select("id")
    .eq("account_id", accountId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await service
    .from("conversations")
    .insert({ account_id: accountId })
    .select("id")
    .single();
  if (created) return created.id;

  // Unique-violation race: someone else created it between the two calls.
  if (error) {
    const { data: again } = await service
      .from("conversations")
      .select("id")
      .eq("account_id", accountId)
      .maybeSingle();
    return again?.id ?? null;
  }
  return null;
}

/** The signed-in account's thread; null when it doesn't exist yet. */
export async function getOwnThread(userId: string): Promise<{
  conversationId: string;
  unread: number;
  messages: MessageRow[];
} | null> {
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, unread_student")
    .eq("account_id", userId)
    .maybeSingle();
  if (!conversation) return null;

  const { data: messages } = await supabase
    .from("messages")
    .select(
      "id, sender_type, sender_user_id, body, kind, event_type, event_payload, created_at, edited_at, read_at"
    )
    .eq("conversation_id", conversation.id)
    .order("created_at")
    .returns<MessageRow[]>();

  return {
    conversationId: conversation.id,
    unread: conversation.unread_student,
    messages: messages ?? [],
  };
}

/** Admin list: every conversation with at least one real message. */
export async function listAdminConversations(): Promise<ConversationListRow[]> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("conversations")
    .select(
      "id, account_id, last_message_at, last_message_preview, last_message_sender, last_activity_at, unread_teacher, pinned, archived, profiles(name)"
    )
    .not("last_message_at", "is", null)
    .eq("archived", false)
    .order("pinned", { ascending: false })
    .order("last_activity_at", { ascending: false });

  if (!rows || rows.length === 0) return [];

  // Ficha names power the guardian sub-line; a ficha matching the account
  // holder's own name is the adult themselves, not an educando.
  const { data: students } = await supabase
    .from("students")
    .select("account_id, name")
    .in(
      "account_id",
      rows.map((r) => r.account_id)
    );

  const now = Date.now();
  return rows.map((row) => {
    const accountName =
      (row.profiles as unknown as { name: string })?.name ?? "—";
    const wardNames = (students ?? [])
      .filter(
        (s) =>
          s.account_id === row.account_id &&
          s.name.trim().toLowerCase() !== accountName.trim().toLowerCase()
      )
      .map((s) => s.name);
    const waitingHours =
      row.last_message_sender === "student" && row.last_message_at
        ? Math.floor((now - new Date(row.last_message_at).getTime()) / 3_600_000)
        : null;
    return {
      id: row.id,
      account_id: row.account_id,
      last_message_at: row.last_message_at as string,
      last_message_preview: row.last_message_preview,
      last_message_sender: row.last_message_sender,
      last_activity_at: row.last_activity_at,
      unread_teacher: row.unread_teacher,
      pinned: row.pinned,
      archived: row.archived,
      accountName,
      wardNames,
      waitingHours,
    };
  });
}

/** One conversation with account context, for the admin thread view. */
export async function getAdminThread(conversationId: string): Promise<{
  conversationId: string;
  accountId: string;
  accountName: string;
  wardNames: string[];
  studentIds: { id: string; name: string }[];
  messages: MessageRow[];
} | null> {
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, account_id, profiles(name)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return null;

  const accountName =
    (conversation.profiles as unknown as { name: string })?.name ?? "—";

  const [{ data: messages }, { data: students }] = await Promise.all([
    supabase
      .from("messages")
      .select(
        "id, sender_type, sender_user_id, body, kind, event_type, event_payload, created_at, edited_at, read_at"
      )
      .eq("conversation_id", conversation.id)
      .order("created_at")
      .returns<MessageRow[]>(),
    supabase
      .from("students")
      .select("id, name")
      .eq("account_id", conversation.account_id)
      .order("created_at"),
  ]);

  const wardNames = (students ?? [])
    .filter(
      (s) => s.name.trim().toLowerCase() !== accountName.trim().toLowerCase()
    )
    .map((s) => s.name);

  return {
    conversationId: conversation.id,
    accountId: conversation.account_id,
    accountName,
    wardNames,
    studentIds: students ?? [],
    messages: messages ?? [],
  };
}

/** Header badge: the caller's unread count (student side or Maria's total). */
export async function unreadCount(
  userId: string,
  isAdmin: boolean
): Promise<number> {
  const supabase = await createClient();
  if (isAdmin) {
    const { data } = await supabase
      .from("conversations")
      .select("unread_teacher")
      .gt("unread_teacher", 0);
    return (data ?? []).reduce((sum, c) => sum + c.unread_teacher, 0);
  }
  const { data } = await supabase
    .from("conversations")
    .select("unread_student")
    .eq("account_id", userId)
    .maybeSingle();
  return data?.unread_student ?? 0;
}

/** The ficha's Mensagens card: the account's last real message, if any. */
export async function getLastMessageForAccount(accountId: string): Promise<{
  conversationId: string;
  body: string | null;
  kind: MessageKind;
  senderType: "student" | "teacher";
  senderName: string;
  createdAt: string;
  waitingHours: number | null;
} | null> {
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, last_message_at, last_message_sender")
    .eq("account_id", accountId)
    .maybeSingle();
  if (!conversation?.last_message_at) return null;

  const { data: message } = await supabase
    .from("messages")
    .select("body, kind, sender_type, created_at, profiles:sender_user_id(name)")
    .eq("conversation_id", conversation.id)
    .neq("kind", "event")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!message) return null;

  const waitingHours =
    conversation.last_message_sender === "student"
      ? Math.floor(
          (Date.now() - new Date(conversation.last_message_at).getTime()) /
            3_600_000
        )
      : null;

  return {
    conversationId: conversation.id,
    body: message.body,
    kind: message.kind as MessageKind,
    senderType: message.sender_type as "student" | "teacher",
    senderName:
      (message.profiles as unknown as { name: string } | null)?.name ?? "—",
    createdAt: message.created_at,
    waitingHours,
  };
}
