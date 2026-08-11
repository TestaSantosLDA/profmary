import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export default async function ProfilePage({
  params,
}: PageProps<"/[locale]/profile">) {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, phone, locale, default_address, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Fichas are admin-only under RLS (private_notes must stay invisible), so
  // the user's own list is read server-side with the service client.
  const { data: fichas } = await createServiceClient()
    .from("students")
    .select("id, name, questionnaire_token")
    .eq("account_id", user.id)
    .order("created_at");

  const nowIso = new Date().toISOString();
  const { data: packPurchases } = await supabase
    .from("pack_purchases")
    .select("id, lessons_remaining, expires_at, status, services(title_pt, title_en)")
    .eq("account_id", user.id)
    .eq("status", "active")
    .order("expires_at", { ascending: true, nullsFirst: false });
  const livePacks = (packPurchases ?? []).filter(
    (p) => p.expires_at === null || p.expires_at > nowIso
  );

  const t = await getTranslations("Profile");
  const tCommon = await getTranslations("Common");

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>
      <ProfileForm profile={profile} isAdmin={profile.is_admin} />
      {livePacks.length > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="font-heading text-[1.05rem] font-semibold">
            {t("packTitle")}
          </h2>
          <div className="divide-y divide-border">
            {livePacks.map((p) => {
              const service = p.services as unknown as {
                title_pt: string;
                title_en: string;
              };
              return (
                <div key={p.id} className="py-3 first:pt-2 last:pb-0">
                  <p className="font-heading text-[30px] font-semibold leading-tight">
                    {t("packBalance", { lessons: p.lessons_remaining })}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {locale === "pt" ? service.title_pt : service.title_en}
                    {p.expires_at &&
                      ` · ${t("packExpires", {
                        date: new Intl.DateTimeFormat(
                          locale === "pt" ? "pt-PT" : "en-GB",
                          { dateStyle: "long", timeZone: "Europe/Lisbon" }
                        ).format(new Date(p.expires_at)),
                      })}`}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground">
            {t("packSharing")}
          </p>
          <div className="mt-4">
            <Button asChild variant="secondary" size="sm">
              <Link href="/packs">{t("packMore")}</Link>
            </Button>
          </div>
        </section>
      )}
      {(fichas ?? []).length > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="font-heading text-[1.05rem] font-semibold">
            {t("questionnaireTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("questionnaireBody")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {(fichas ?? []).map((ficha) => (
              <Button key={ficha.id} asChild variant="secondary" size="sm">
                <Link href={`/questionario/${ficha.questionnaire_token}`}>
                  {(fichas ?? []).length > 1
                    ? t("questionnaireCtaFor", { name: ficha.name })
                    : t("questionnaireCta")}
                </Link>
              </Button>
            ))}
          </div>
        </section>
      )}
      <form action={signOut} className="mt-8">
        <Button type="submit" variant="ghost">
          {tCommon("signOut")}
        </Button>
      </form>
    </main>
  );
}
