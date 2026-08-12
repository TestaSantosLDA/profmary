import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MessageThread } from "@/components/messages/message-thread";
import { getAdminThread } from "@/lib/messages/queries";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminMessageThreadPage({
  params,
}: PageProps<"/[locale]/admin/messages/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const thread = await getAdminThread(id);
  if (!thread) notFound();

  const t = await getTranslations("AdminMessages");

  return (
    <main className="mx-auto w-full max-w-[640px]">
      <Link
        href="/admin/messages"
        className="text-sm text-muted-foreground no-underline hover:text-foreground"
      >
        ← {t("title")}
      </Link>

      <div className="mb-5 mt-2 flex items-center gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary font-heading font-semibold text-primary">
          {thread.accountName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join("")}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{thread.accountName}</h1>
          <p className="text-[13px] text-muted-foreground">
            {thread.wardNames.length > 0
              ? `${thread.wardNames.join(", ")} · ${t("ward")}`
              : t("accountLine")}
          </p>
        </div>
        {thread.studentIds.length > 0 && (
          <Link
            href={`/admin/students/${thread.studentIds[0].id}`}
            className="shrink-0 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground hover:no-underline"
          >
            {t("viewFicha")}
          </Link>
        )}
      </div>

      <MessageThread
        conversationId={thread.conversationId}
        messages={thread.messages}
        viewer="teacher"
        locale={locale}
        emptyLine={t("threadEmpty")}
      />
    </main>
  );
}
