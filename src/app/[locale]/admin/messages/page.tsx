import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  listAdminConversations,
  OVERDUE_HOURS,
} from "@/lib/messages/queries";
import { requireAdmin } from "@/lib/auth/require-admin";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AdminMessagesPage({
  params,
}: PageProps<"/[locale]/admin/messages">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const conversations = await listAdminConversations();
  const overdue = conversations.filter(
    (c) => (c.waitingHours ?? 0) >= OVERDUE_HOURS
  );

  const t = await getTranslations("AdminMessages");

  const timeFmt = new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateFmt = new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    day: "numeric",
    month: "short",
  });
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    dateStyle: "short",
  });
  const stamp = (iso: string) => {
    const d = new Date(iso);
    return todayKey.format(d) === todayKey.format(new Date())
      ? timeFmt.format(d)
      : dateFmt.format(d);
  };

  return (
    <main>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("note")}</p>

      {overdue.length > 0 && (
        <div className="mt-5 rounded-xl border border-destructive bg-card p-4">
          <p className="text-sm font-semibold text-destructive">
            {t("overdueAlert", { count: overdue.length })}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("overdueAlertHint")}
          </p>
        </div>
      )}

      {conversations.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
          <div className="divide-y divide-border">
            {conversations.map((c) => {
              const isOverdue = (c.waitingHours ?? 0) >= OVERDUE_HOURS;
              const isUnread = c.unread_teacher > 0;
              return (
                <Link
                  key={c.id}
                  href={`/admin/messages/${c.id}`}
                  className={`flex items-center gap-3 border-l-[3px] px-4 py-3.5 text-foreground no-underline hover:no-underline ${
                    isOverdue ? "border-l-destructive" : "border-l-transparent"
                  } ${isUnread ? "bg-secondary" : ""}`}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-sm font-semibold text-primary">
                    {initials(c.accountName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span
                        className={`truncate text-[15px] ${
                          isUnread ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {c.accountName}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {stamp(c.last_activity_at)}
                      </span>
                    </span>
                    {c.wardNames.length > 0 && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.wardNames.join(", ")} · {t("ward")}
                      </span>
                    )}
                    <span
                      className={`block truncate text-sm ${
                        isUnread ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {c.last_message_sender === "teacher" && t("mariaPrefix")}
                      {c.last_message_preview}
                    </span>
                    {isOverdue && (
                      <span className="block text-xs font-semibold text-destructive">
                        {t("waiting", { hours: c.waitingHours ?? 0 })}
                      </span>
                    )}
                  </span>
                  {isUnread && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                      {c.unread_teacher}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
