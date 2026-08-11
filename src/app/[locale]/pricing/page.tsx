import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { createServiceClient } from "@/lib/supabase/server";

export const revalidate = 300;

type ServiceRow = {
  id: string;
  title_pt: string;
  title_en: string;
  description_pt: string;
  description_en: string;
  hourly_rate_cents: number;
  min_duration_minutes: number;
  max_duration_minutes: number;
  attendee_cap: number;
};

export default async function PricingPage({
  params,
}: PageProps<"/[locale]/pricing">) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Service client: the public pricing page must render without a session.
  const supabase = createServiceClient();
  const [{ data: services }, { data: settings }] = await Promise.all([
    supabase
      .from("services")
      .select(
        "id, title_pt, title_en, description_pt, description_en, hourly_rate_cents, min_duration_minutes, max_duration_minutes, attendee_cap"
      )
      .eq("active", true)
      .order("sort_order")
      .returns<ServiceRow[]>(),
    supabase
      .from("settings")
      .select("travel_fee_cents, travel_fee_threshold_km")
      .single(),
  ]);

  const t = await getTranslations("PricingPage");

  const rate = (cents: number) =>
    (cents / 100).toFixed(2).replace(".", locale === "pt" ? "," : ".");

  return (
    <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 py-12">
      <h1 className="text-3xl">{t("title")}</h1>
      <p className="mt-2 max-w-[58ch] text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        {(services ?? []).map((s, i) => (
          <div
            key={s.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
          >
            <h2 className="font-heading text-[19px] font-semibold">
              {locale === "pt" ? s.title_pt : s.title_en}
            </h2>
            <p className="flex-1 text-sm text-muted-foreground">
              {locale === "pt" ? s.description_pt : s.description_en}
            </p>
            <p>
              <span className="font-heading text-[26px] font-semibold">
                {rate(s.hourly_rate_cents)}€
              </span>
              <span className="text-[13px] text-muted-foreground">
                {" "}
                {t("perHourPerPerson")}
              </span>
            </p>
            <p className="text-[13px] text-muted-foreground">
              {t("durationRange", {
                min: s.min_duration_minutes,
                max: s.max_duration_minutes,
              })}
              {s.attendee_cap !== -1 &&
                ` · ${t("maxAttendees", { cap: s.attendee_cap })}`}
            </p>
            <Button asChild variant={i === 0 ? "default" : "outline"}>
              <Link href="/book" className="no-underline hover:no-underline">
                {t("cta")}
              </Link>
            </Button>
          </div>
        ))}
      </div>

      {(services ?? []).length === 0 && (
        <p className="mt-8 text-muted-foreground">{t("empty")}</p>
      )}

      {settings && settings.travel_fee_cents > 0 && (
        <p className="mt-6 text-[13px] text-muted-foreground">
          {t("travelFeeNote", {
            amount: rate(settings.travel_fee_cents),
            km: settings.travel_fee_threshold_km,
          })}
        </p>
      )}
    </main>
  );
}
