import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ContentItem } from "@/components/admin/about-editor";
import { Photo } from "@/components/media/photo";
import { Button } from "@/components/ui/button";
import { TileBand } from "@/components/ui/tile-band";
import { createServiceClient } from "@/lib/supabase/server";

export const revalidate = 300;

// Content column shared by every section; tinted sections go full-bleed with
// this wrapper inside. `wide` breakpoint is 880px, matching Book.
const WRAP = "mx-auto w-full max-w-[1040px] px-5";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Service client: the public home page must render without a session.
  const supabase = createServiceClient();
  const [{ data: content }, { data: services }, { data: settings }] =
    await Promise.all([
      supabase
        .from("site_content")
        .select("photo_url, highlights, steps")
        .eq("key", "about")
        .single(),
      supabase
        .from("services")
        .select("hourly_rate_cents")
        .eq("active", true)
        .returns<{ hourly_rate_cents: number }[]>(),
      supabase
        .from("settings")
        .select("onsite_fee_cents, onsite_fee_mode")
        .single(),
    ]);

  const t = await getTranslations("Home");
  // The formats cards mirror the Book mode picker copy so the at-home fee is
  // never a surprise at checkout.
  const tBook = await getTranslations("BookingForm");

  const pick = (pt: string, en: string) => (locale === "pt" ? pt || en : en || pt);
  const money = (cents: number) => {
    const value = (cents / 100).toFixed(2);
    return locale === "pt" ? `${value.replace(".", ",")}€` : `€${value}`;
  };

  const feeTag = `+${money(settings?.onsite_fee_cents ?? 500)}`;

  // Lowest hourly rate among active services anchors the price section.
  const rates = (services ?? []).map((s) => s.hourly_rate_cents);
  const minRate = rates.length > 0 ? Math.min(...rates) : null;

  const audiences: { title: string; body: string }[] = (
    (content?.highlights ?? []) as ContentItem[]
  ).map((h) => ({ title: pick(h.title_pt, h.title_en), body: pick(h.body_pt, h.body_en) }));
  if (audiences.length === 0) {
    for (const k of ["international", "exam"] as const) {
      audiences.push({
        title: t(`audience.${k}.title`),
        body: t(`audience.${k}.body`),
      });
    }
  }

  const steps: { title: string; body: string }[] = (
    (content?.steps ?? []) as ContentItem[]
  ).map((s) => ({ title: pick(s.title_pt, s.title_en), body: pick(s.body_pt, s.body_en) }));
  if (steps.length === 0) {
    for (const n of [1, 2, 3] as const) {
      steps.push({ title: t(`steps.${n}.title`), body: t(`steps.${n}.body`) });
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <TileBand height={12} />

      {/* Hero */}
      <section className={`${WRAP} py-14 min-[880px]:py-20`}>
        <div className="grid items-center gap-12 min-[880px]:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h1 className="max-w-[18ch] text-balance text-[2.2rem] leading-[1.08] min-[880px]:text-[3.1rem]">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-[40ch] text-[19px] text-foreground">
              {t("lede")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/book" className="no-underline hover:no-underline">
                  {t("ctaPrimary")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/pricing" className="no-underline hover:no-underline">
                  {t("ctaSecondary")}
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-[13px] text-muted-foreground">
              {t("replyLine")}
            </p>
          </div>
          <Photo
            src={content?.photo_url}
            alt={t("heroPhotoAlt")}
            ratio="4/5"
            note={t("heroPhotoNote")}
            search="portuguese teacher portrait warm"
          />
        </div>
      </section>

      {/* Formats — mirrors the Book mode picker */}
      <section className="bg-muted">
        <div className={`${WRAP} py-12`}>
          <h2 className="text-2xl">{t("formatsTitle")}</h2>
          <div className="mt-6 grid gap-4 min-[880px]:grid-cols-2">
            {(
              [
                { key: "onsite", tag: feeTag, tagClass: "text-accent" },
                {
                  key: "online",
                  tag: tBook("included"),
                  tagClass: "text-muted-foreground",
                },
              ] as const
            ).map(({ key, tag, tagClass }) => (
              <div key={key} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-heading text-[19px] font-semibold">
                    {tBook(key)}
                  </h3>
                  <span className={`text-[13px] font-semibold ${tagClass}`}>
                    {tag}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {tBook(`${key}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who I work with */}
      <section className={`${WRAP} py-14`}>
        <h2 className="text-2xl">{t("audienceTitle")}</h2>
        <div className="mt-6 grid gap-4 min-[880px]:grid-cols-2">
          {audiences.map((item, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-heading text-base font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How lessons work */}
      <section className={`${WRAP} pb-14`}>
        <div className="grid items-center gap-12 min-[880px]:grid-cols-2">
          <div>
            <h2 className="text-2xl">{t("howTitle")}</h2>
            <ol className="mt-6 space-y-5">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-heading font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <Photo
            ratio="5/4"
            note={t("howPhotoNote")}
            search="language tutor lesson at table"
          />
        </div>
      </section>

      {/* Price anchor + testimonial */}
      <section className="bg-muted">
        <div
          className={`${WRAP} grid gap-6 py-12 min-[880px]:grid-cols-[0.8fr_1.2fr]`}
        >
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
              {t("priceKicker")}
            </p>
            <p className="mt-3 flex items-baseline gap-1">
              <span className="font-heading text-[40px] font-semibold leading-none">
                {minRate !== null ? money(minRate) : "—"}
              </span>
              <span className="text-[15px] text-muted-foreground">
                {t("priceUnit")}
              </span>
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{t("priceNote")}</p>
            <Button asChild variant="outline" className="mt-5">
              <Link href="/pricing" className="no-underline hover:no-underline">
                {t("priceCta")}
              </Link>
            </Button>
          </div>
          <div className="flex flex-col justify-center rounded-xl border border-border bg-card p-6">
            <blockquote className="font-heading text-[22px] leading-snug">
              “{t("testimonialQuote")}”
            </blockquote>
            <div className="mt-5 flex items-center gap-3">
              <Photo round showLabel={false} className="w-10 shrink-0" />
              <p className="text-sm">
                <span className="font-semibold">{t("testimonialName")}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {t("testimonialContext")}
                </span>
              </p>
            </div>
            <p className="mt-4 font-mono text-[11px] text-muted-foreground/80">
              {t("testimonialPlaceholder")}
            </p>
          </div>
        </div>
      </section>

      {/* Close */}
      <section className={`${WRAP} py-16 text-center`}>
        <h2 className="text-balance text-[1.7rem]">{t("closeTitle")}</h2>
        <Button asChild size="lg" className="mt-6">
          <Link href="/book" className="no-underline hover:no-underline">
            {t("ctaPrimary")}
          </Link>
        </Button>
      </section>

      <TileBand height={12} />
    </main>
  );
}
