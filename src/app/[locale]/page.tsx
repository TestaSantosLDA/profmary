import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/media/photo";
import { Button } from "@/components/ui/button";
import { RuleBand } from "@/components/ui/rule-band";
import {
  normalizeHome,
  type HomeVisibility,
  type MediaMap,
} from "@/lib/content/page-content";
import { createServiceClient } from "@/lib/supabase/server";

export const revalidate = 300;

// Content column shared by every section; tinted sections go full-bleed with
// this wrapper inside. `wide` breakpoint is 880px, matching Book.
const WRAP = "mx-auto w-full max-w-[1040px] px-5";

type PageRow = { content: unknown } & HomeVisibility;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Service client: the public home page must render without a session.
  const supabase = createServiceClient();
  const [{ data: page }, { data: mediaRows }, { data: services }, { data: settings }] =
    await Promise.all([
      supabase
        .from("page_content")
        .select(
          "content, show_formats, show_audiences, show_steps, show_price, show_testimonials"
        )
        .eq("page", "home")
        .single<PageRow>(),
      supabase.from("media").select("slot, url"),
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

  const content = normalizeHome(page?.content);
  const media: MediaMap = Object.fromEntries(
    (mediaRows ?? []).map((r) => [r.slot, r.url])
  );

  // Empty EN falls back to PT; empty PT falls back to the i18n launch copy.
  const pick = (pt: string, en: string) => (locale === "pt" ? pt || en : en || pt);
  const money = (cents: number) => {
    const value = (cents / 100).toFixed(2);
    return locale === "pt" ? `${value.replace(".", ",")}€` : `€${value}`;
  };

  const feeTag = `+${money(settings?.onsite_fee_cents ?? 500)}`;

  // Lowest hourly rate among active services anchors the price section.
  const rates = (services ?? []).map((s) => s.hourly_rate_cents);
  const minRate = rates.length > 0 ? Math.min(...rates) : null;

  const heroTitle = pick(content.hero.title_pt, content.hero.title_en) || t("title");
  const lede = pick(content.hero.lede_pt, content.hero.lede_en) || t("lede");
  // Reply line: empty means hidden, not "use the default".
  const reply = pick(content.hero.reply_pt, content.hero.reply_en);

  const audiences = content.audiences.items.map((h) => ({
    title: pick(h.title_pt, h.title_en),
    body: pick(h.body_pt, h.body_en),
  }));
  if (audiences.length === 0) {
    for (const k of ["international", "exam"] as const) {
      audiences.push({
        title: t(`audience.${k}.title`),
        body: t(`audience.${k}.body`),
      });
    }
  }

  const steps = content.steps.items.map((s) => ({
    title: pick(s.title_pt, s.title_en),
    body: pick(s.body_pt, s.body_en),
  }));
  if (steps.length === 0) {
    for (const n of [1, 2, 3] as const) {
      steps.push({ title: t(`steps.${n}.title`), body: t(`steps.${n}.body`) });
    }
  }

  // With more than one testimonial, show one at random per regeneration;
  // without any, fall back to the labelled mock quote.
  const quotes = content.testimonials.items;
  // eslint-disable-next-line react-hooks/purity -- deliberate per-render rotation
  const chosen = quotes.length > 0 ? quotes[Math.floor(Math.random() * quotes.length)] : null;
  const testimonial = chosen
    ? {
        quote: pick(chosen.quote_pt, chosen.quote_en),
        name: chosen.name,
        context: pick(chosen.context_pt, chosen.context_en),
        photo: media[`testimonial_${chosen.id}`],
        placeholder: false,
      }
    : {
        quote: t("testimonialQuote"),
        name: t("testimonialName"),
        context: t("testimonialContext"),
        photo: undefined,
        placeholder: true,
      };

  const showPriceBand = (page?.show_price ?? true) || (page?.show_testimonials ?? true);

  return (
    <main className="flex flex-1 flex-col">
      {/* The "sheet of paper" band under the header: five ruled lines. */}
      <RuleBand height={56} lines={5} />

      {/* Hero */}
      <section className={`${WRAP} py-14 min-[880px]:pt-10 min-[880px]:pb-20`}>
        <div className="grid items-center gap-12 min-[880px]:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h1 className="max-w-[18ch] text-balance text-[2.2rem] leading-[1.08] min-[880px]:text-[3.1rem]">
              {heroTitle}
            </h1>
            <p className="mt-5 max-w-[40ch] text-[19px] text-foreground">{lede}</p>
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
            {reply && (
              <p className="mt-4 text-[13px] text-muted-foreground">{reply}</p>
            )}
          </div>
          <Photo
            src={media.home_hero}
            alt={t("heroPhotoAlt")}
            ratio="4/5"
            note={t("heroPhotoNote")}
            search="portuguese teacher portrait warm"
          />
        </div>
      </section>

      {/* Formats — mirrors the Book mode picker */}
      {(page?.show_formats ?? true) && (
        <section className="bg-muted">
          <div className={`${WRAP} py-12`}>
            <h2 className="text-2xl">
              {pick(content.formats.title_pt, content.formats.title_en) ||
                t("formatsTitle")}
            </h2>
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
      )}

      {/* Who I work with */}
      {(page?.show_audiences ?? true) && (
        <section className={`${WRAP} py-14`}>
          <h2 className="text-2xl">
            {pick(content.audiences.title_pt, content.audiences.title_en) ||
              t("audienceTitle")}
          </h2>
          <div className="mt-6 grid gap-4 min-[880px]:grid-cols-2">
            {audiences.map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-heading text-base font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* How lessons work */}
      {(page?.show_steps ?? true) && (
        <section className={`${WRAP} pb-14`}>
          <div className="grid items-center gap-12 min-[880px]:grid-cols-2">
            {/* Photo left on desktop to alternate with the hero; text stays first on mobile. */}
            <div className="min-[880px]:order-last">
              <h2 className="text-2xl">
                {pick(content.steps.title_pt, content.steps.title_en) || t("howTitle")}
              </h2>
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
              src={media.home_how}
              alt=""
              ratio="5/4"
              note={t("howPhotoNote")}
              search="language tutor lesson at table"
            />
          </div>
        </section>
      )}

      {/* Price anchor + testimonial */}
      {showPriceBand && (
        <section className="bg-muted">
          <div
            className={`${WRAP} grid gap-6 py-12 ${
              (page?.show_price ?? true) && (page?.show_testimonials ?? true)
                ? "min-[880px]:grid-cols-[0.8fr_1.2fr]"
                : ""
            }`}
          >
            {(page?.show_price ?? true) && (
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
                <p className="mt-3 text-sm text-muted-foreground">
                  {pick(content.price.note_pt, content.price.note_en) || t("priceNote")}
                </p>
                <Button asChild variant="outline" className="mt-5">
                  <Link href="/pricing" className="no-underline hover:no-underline">
                    {t("priceCta")}
                  </Link>
                </Button>
              </div>
            )}
            {(page?.show_testimonials ?? true) && (
              <div className="flex flex-col justify-center rounded-xl border border-border bg-card p-6">
                <blockquote className="font-heading text-[22px] leading-snug">
                  “{testimonial.quote}”
                </blockquote>
                <div className="mt-5 flex items-center gap-3">
                  <Photo
                    src={testimonial.photo}
                    round
                    showLabel={false}
                    className="w-10 shrink-0"
                  />
                  <p className="text-sm">
                    <span className="font-semibold">{testimonial.name}</span>
                    {testimonial.context && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {testimonial.context}
                      </span>
                    )}
                  </p>
                </div>
                {testimonial.placeholder && (
                  <p className="mt-4 font-mono text-[11px] text-muted-foreground/80">
                    {t("testimonialPlaceholder")}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <RuleBand height={24} />

      {/* Close */}
      <section className={`${WRAP} py-16 text-center`}>
        <h2 className="text-balance text-[1.7rem]">
          {pick(content.close.title_pt, content.close.title_en) || t("closeTitle")}
        </h2>
        <Button asChild size="lg" className="mt-6">
          <Link href="/book" className="no-underline hover:no-underline">
            {pick(content.close.button_pt, content.close.button_en) || t("ctaPrimary")}
          </Link>
        </Button>
      </section>
    </main>
  );
}
