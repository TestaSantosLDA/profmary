import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function AdminServicesPage({
  params,
}: PageProps<"/[locale]/admin/services">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, title_pt, title_en, hourly_rate_cents, min_duration_minutes, max_duration_minutes, attendee_cap, active, allows_online, allows_onsite")
    .order("sort_order")
    .order("created_at");

  const modesLabel = (s: { allows_online: boolean; allows_onsite: boolean }) =>
    s.allows_online && s.allows_onsite
      ? "modesBoth"
      : s.allows_online
        ? "modesOnline"
        : "modesOnsite";

  const t = await getTranslations("AdminServices");

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button asChild>
          <Link href="/admin/services/new">{t("newService")}</Link>
        </Button>
      </div>

      <ul className="divide-y rounded-xl border border-border bg-card">
        {(services ?? []).map((s) => (
          <li key={s.id}>
            <Link
              href={`/admin/services/${s.id}`}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-accent"
            >
              <div>
                <p className="font-medium">
                  {locale === "pt" ? s.title_pt : s.title_en}
                  {!s.active && (
                    <span className="ml-2 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {t("inactive")}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(s.hourly_rate_cents / 100).toFixed(2)}€/h ·{" "}
                  {s.min_duration_minutes}–{s.max_duration_minutes} min ·{" "}
                  {s.attendee_cap === -1
                    ? t("uncapped")
                    : t("capped", { cap: s.attendee_cap })}
                </p>
                <p className="text-xs font-semibold text-accent">
                  {t(modesLabel(s))}
                </p>
              </div>
            </Link>
          </li>
        ))}
        {(services ?? []).length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("empty")}
          </li>
        )}
      </ul>
    </main>
  );
}
