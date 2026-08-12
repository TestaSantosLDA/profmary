"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  editMessage,
  markConversationRead,
  sendMessage,
  type MessageActionState,
} from "@/lib/messages/actions";
import type { MessageRow } from "@/lib/messages/queries";

const LISBON = "Europe/Lisbon";
const EDIT_WINDOW_MS = 5 * 60_000;
const POLL_MS = 10_000;

type Viewer = "student" | "teacher";

// Local-day key in Lisbon; en-CA gives a stable YYYY-MM-DD.
function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LISBON,
    dateStyle: "short",
  }).format(new Date(iso));
}

// Touch keyboards keep Enter as a newline; only fine pointers send on Enter.
function subscribePointer(callback: () => void) {
  const mql = window.matchMedia("(pointer: coarse)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}
const getPointerSnapshot = () =>
  window.matchMedia("(pointer: coarse)").matches;

// A 30-second clock, so "Editar" affordances expire without interaction.
// Server snapshot is 0: nothing renders as editable until after hydration.
function subscribeTick(callback: () => void) {
  const id = setInterval(callback, 30_000);
  return () => clearInterval(id);
}
const getTickSnapshot = () => Math.floor(Date.now() / 30_000);

function DaySeparator({ label }: { label: string }) {
  return (
    <p className="text-center text-xs text-muted-foreground">{label}</p>
  );
}

export function MessageThread({
  conversationId,
  messages,
  viewer,
  locale,
  emptyLine,
}: {
  conversationId: string | null;
  messages: MessageRow[];
  viewer: Viewer;
  locale: string;
  /** The student and admin empty states differ; the parent chooses. */
  emptyLine: string;
}) {
  const t = useTranslations("Messages");
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [editing, setEditing] = useState<MessageRow | null>(null);
  const coarsePointer = useSyncExternalStore(
    subscribePointer,
    getPointerSnapshot,
    () => false
  );
  const now =
    useSyncExternalStore(subscribeTick, getTickSnapshot, () => 0) * 30_000;

  const [sendState, sendAction, sending] = useActionState<
    MessageActionState,
    FormData
  >(sendMessage, { error: null });
  const [editState, editAction, savingEdit] = useActionState<
    MessageActionState,
    FormData
  >(editMessage, { error: null });

  // Polling transport — the design survives a realtime swap unchanged.
  useEffect(() => {
    const poll = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(poll);
  }, [router]);

  // Opening the thread reads it; re-run when polled props bring new arrivals.
  const unreadIncoming = messages.some(
    (m) => m.kind !== "event" && m.sender_type !== null && m.sender_type !== viewer && !m.read_at
  );
  useEffect(() => {
    if (conversationId && unreadIncoming) {
      void markConversationRead(conversationId);
    }
  }, [conversationId, unreadIncoming]);

  // Stick to the latest message.
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lastId]);

  // Successful send/edit: clear the composer, leave errors visible.
  const wasSending = useRef(false);
  useEffect(() => {
    if (wasSending.current && !sending && !savingEdit) {
      const failed = editing ? editState.error : sendState.error;
      if (!failed && textareaRef.current) {
        textareaRef.current.value = "";
        textareaRef.current.style.height = "44px";
        setEditing(null);
      }
      router.refresh();
    }
    wasSending.current = sending || savingEdit;
  }, [sending, savingEdit, sendState.error, editState.error, editing, router]);

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
        timeZone: LISBON,
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale]
  );
  const dayFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
        timeZone: LISBON,
        day: "numeric",
        month: "long",
      }),
    [locale]
  );
  const eventWhenFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
        timeZone: LISBON,
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale]
  );

  const dayLabel = (iso: string): string => {
    const key = dayKey(iso);
    const now = new Date();
    if (key === dayKey(now.toISOString())) return t("today");
    if (key === dayKey(new Date(now.getTime() - 86_400_000).toISOString())) {
      return t("yesterday");
    }
    return dayFmt.format(new Date(iso));
  };

  const eventLabel = (m: MessageRow): string => {
    if (!m.event_type) return "";
    if (m.event_type === "pack_activated") {
      return t("events.pack_activated", { lessons: m.event_payload?.lessons ?? 0 });
    }
    const when = m.event_payload?.starts_at
      ? eventWhenFmt.format(new Date(m.event_payload.starts_at))
      : "";
    const mode = m.event_payload?.mode
      ? ` · ${t(`mode.${m.event_payload.mode}`)}`
      : "";
    return `${t(`events.${m.event_type}`, { when })}${mode}`;
  };

  const startEditing = (m: MessageRow) => {
    setEditing(m);
    if (textareaRef.current) {
      textareaRef.current.value = m.body ?? "";
      textareaRef.current.focus();
      autosize(textareaRef.current);
    }
  };

  const cancelEditing = () => {
    setEditing(null);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "44px";
    }
  };

  const autosize = (el: HTMLTextAreaElement) => {
    el.style.height = "44px";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const submitComposer = () => {
    // requestSubmit routes through the form's action.
    textareaRef.current?.form?.requestSubmit();
  };

  const errorKey = editing
    ? editState.error && `errors.${editState.error}`
    : sendState.error && `errors.${sendState.error}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        ref={scrollRef}
        className="flex max-h-[60dvh] min-h-[280px] flex-col gap-3.5 overflow-y-auto bg-background p-4"
      >
        {messages.length === 0 && (
          <p className="m-auto max-w-[36ch] text-center text-sm text-muted-foreground">
            {emptyLine}
          </p>
        )}
        {messages.map((m, i) => {
          const separator =
            i === 0 ||
            dayKey(messages[i - 1].created_at) !== dayKey(m.created_at) ? (
              <DaySeparator label={dayLabel(m.created_at)} />
            ) : null;

          if (m.kind === "event") {
            return (
              <div key={m.id} className="contents">
                {separator}
                <p className="mx-auto max-w-[40ch] rounded-full border border-dashed border-border bg-card px-3.5 py-2 text-center text-[13px] text-muted-foreground">
                  {eventLabel(m)}
                </p>
              </div>
            );
          }

          const mine = m.sender_type === viewer;
          const editable =
            now > 0 &&
            mine &&
            m.kind === "text" &&
            now - new Date(m.created_at).getTime() < EDIT_WINDOW_MS;

          return (
            <div key={m.id} className="contents">
              {separator}
              <div className={mine ? "flex flex-col items-end" : "flex flex-col items-start"}>
                <div
                  className={
                    mine
                      ? "max-w-[min(80%,42ch)] rounded-2xl rounded-br-[4px] bg-primary px-3.5 py-2.5 text-[15px] leading-relaxed text-primary-foreground"
                      : "max-w-[min(80%,42ch)] rounded-2xl rounded-bl-[4px] border border-border bg-card px-3.5 py-2.5 text-[15px] leading-relaxed"
                  }
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {timeFmt.format(new Date(m.created_at))}
                  {m.edited_at && ` · ${t("edited")}`}
                  {mine && m.read_at && ` · ${t("read")}`}
                  {editable && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        onClick={() => startEditing(m)}
                        className="font-medium text-primary hover:underline"
                      >
                        {t("edit")}
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border bg-card p-3">
        {editing && (
          <p className="mb-2 flex items-center justify-between text-[13px] text-muted-foreground">
            {t("editingNotice")}
            <button
              type="button"
              onClick={cancelEditing}
              className="font-medium text-primary hover:underline"
            >
              {t("cancelEdit")}
            </button>
          </p>
        )}
        <form
          action={editing ? editAction : sendAction}
          className="flex items-end gap-2"
        >
          {editing ? (
            <input type="hidden" name="id" value={editing.id} />
          ) : (
            conversationId &&
            viewer === "teacher" && (
              <input type="hidden" name="conversation_id" value={conversationId} />
            )
          )}
          <textarea
            ref={textareaRef}
            name="body"
            rows={1}
            required
            maxLength={4000}
            placeholder={t("composerPlaceholder")}
            onInput={(e) => autosize(e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !coarsePointer) {
                e.preventDefault();
                submitComposer();
              }
            }}
            className="min-h-[44px] max-h-[120px] flex-1 resize-none rounded-xl bg-background px-3.5 py-3 text-[15px] leading-snug outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={sending || savingEdit}
            aria-label={t("send")}
            className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground transition-colors hover:bg-[#173A75] disabled:opacity-60"
          >
            <Send className="size-5" strokeWidth={1.8} />
          </button>
        </form>
        {errorKey && (
          <p className="mt-2 text-[13px] font-medium text-destructive">
            {t(errorKey)}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{t("editHint")}</p>
      </div>
    </div>
  );
}
