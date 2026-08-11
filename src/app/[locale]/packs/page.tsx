import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { PackRequestForm } from "@/components/packs/pack-request-form";
import { createClient } from "@/lib/supabase/server";
import type { PackRow } from "@/lib/packs/queries";

export default async function PacksPage({
  params,
  searchParams,
}: PageProps<"/[locale]/packs">) {
  const { locale } = await params;
  const { pack } = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const [{ data: services }, { data: packs }] = await Promise.all([
    supabase
      .from("services")
      .select("id, title_pt, title_en, hourly_rate_cents")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("packs")
      .select("id, service_id, lessons, price_per_lesson_cents, validity_months, active")
      .eq("active", true)
      .order("lessons")
      .returns<PackRow[]>(),
  ]);

  const t = await getTranslations("PacksPage");

  return (
    <main className="mx-auto w-full max-w-[640px] flex-1 px-4 py-12">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 max-w-[56ch] text-muted-foreground">{t("intro")}</p>
      <PackRequestForm
        services={services ?? []}
        packs={packs ?? []}
        preselectPackId={typeof pack === "string" ? pack : null}
      />
    </main>
  );
}
