import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { MessageThread } from "@/components/messages/message-thread";
import { getOwnThread } from "@/lib/messages/queries";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export default async function MessagesPage({
  params,
}: PageProps<"/[locale]/messages">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const [thread, { data: profile }, { data: fichas }] = await Promise.all([
    getOwnThread(user.id),
    supabase.from("profiles").select("name").eq("id", user.id).single(),
    // Fichas are admin-only under RLS; the shared-thread note needs them.
    createServiceClient()
      .from("students")
      .select("name")
      .eq("account_id", user.id),
  ]);

  const accountName = profile?.name ?? "";
  const hasWards = (fichas ?? []).some(
    (f) => f.name.trim().toLowerCase() !== accountName.trim().toLowerCase()
  );

  const t = await getTranslations("Messages");

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-12">
      <div className="mb-6 flex items-center gap-3.5">
        <span className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-lg font-semibold text-primary">
          M
        </span>
        <div>
          <h1 className="font-heading text-[1.35rem] font-semibold leading-tight">
            {t("mariaName")}
          </h1>
          <p className="text-[13px] text-muted-foreground">{t("replySoon")}</p>
        </div>
      </div>

      <MessageThread
        conversationId={thread?.conversationId ?? null}
        messages={thread?.messages ?? []}
        viewer="student"
        locale={locale}
        emptyLine={t("empty")}
      />

      {hasWards && (
        <p className="mt-3 text-[13px] text-muted-foreground">
          {t("sharedWithGuardian")}
        </p>
      )}
    </main>
  );
}
