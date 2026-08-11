import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ContentItem } from "@/components/admin/about-editor";
import { Photo } from "@/components/media/photo";
import { Button } from "@/components/ui/button";
import { RuleBand } from "@/components/ui/rule-band";
import { createServiceClient } from "@/lib/supabase/server";

export const revalidate = 300;

const WRAP = "mx-auto w-full max-w-[1040px] px-5";

// The three lesson-strip placeholder frames (photo brief in handoff 11).
const STRIP = [
  { note: "stripNote1", search: "notebook coffee study table" },
  { note: "stripNote2", search: "lisbon street azulejo tiles" },
  { note: "stripNote3", search: "portuguese language books" },
] as const;

export default async function AboutPage({
  params,
}: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createServiceClient();
  const { data: content } = await supabase
    .from("site_content")
    .select(
      "photo_url, display_name, tagline_pt, tagline_en, intro_pt, intro_en, highlights"
    )
    .eq("key", "about")
    .single();

  const t = await getTranslations("AboutPage");
  // Audience cards moved to Home; the fallback copy lives there now.
  const tHome = await getTranslations("Home");

  // Each field falls back to the other locale, then to the i18n copy.
  const pick = (pt: string, en: string) => (locale === "pt" ? pt || en : en || pt);
  const tagline =
    pick(content?.tagline_pt ?? "", content?.tagline_en ?? "") ||
    t("taglineFallback");

  // Admin intro splits into paragraphs on blank lines; the i18n fallback is
  // written as two paragraphs already.
  const intro = pick(content?.intro_pt ?? "", content?.intro_en ?? "");
  const paragraphs = intro
    ? intro.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [t("introFallback1"), t("introFallback2")];

  const audiences: { title: string; body: string }[] = (
    (content?.highlights ?? []) as ContentItem[]
  ).map((h) => ({ title: pick(h.title_pt, h.title_en), body: pick(h.body_pt, h.body_en) }));
  if (audiences.length === 0) {
    for (const k of ["international", "exam"] as const) {
      audiences.push({
        title: tHome(`audience.${k}.title`),
        body: tHome(`audience.${k}.body`),
      });
    }
  }

  const facts = [1, 2, 3] as const;

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className={`${WRAP} py-14 min-[880px]:py-20`}>
        <div className="grid items-center gap-12 min-[880px]:grid-cols-[0.9fr_1.1fr]">
          <Photo
            src={content?.photo_url}
            alt={t("photoAlt")}
            ratio="4/5"
            note={t("portraitNote")}
            search="portuguese woman teacher portrait"
          />
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
              {t("kicker")}
            </p>
            <h1 className="mt-2 text-[2.6rem] leading-[1.1]">
              {content?.display_name || "Maria Martins"}
            </h1>
            <p className="mt-1 text-lg text-primary">{tagline}</p>
            <div className="mt-5 space-y-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="max-w-[50ch] text-[17px]">
                  {p}
                </p>
              ))}
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-5">
              {facts.map((n) => (
                <li key={n}>
                  <span className="font-heading text-xl font-semibold">
                    {t(`facts.${n}.value`)}
                  </span>{" "}
                  <span className="text-[13px] text-muted-foreground">
                    {t(`facts.${n}.caption`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Who I work with */}
      <section className="bg-muted">
        <div className={`${WRAP} py-12`}>
          <h2 className="text-2xl">{t("audienceTitle")}</h2>
          <div className="mt-6 grid gap-4 min-[880px]:grid-cols-2">
            {audiences.map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-heading text-base font-semibold">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What lessons look like */}
      <section className={`${WRAP} py-14`}>
        <h2 className="text-2xl">{t("lessonsTitle")}</h2>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {STRIP.map(({ note, search }) => (
            <Photo key={note} ratio="1/1" note={t(note)} search={search} />
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-[44ch] text-center font-heading text-[21px] leading-normal">
          {t("lessonsClosing")}
        </p>
      </section>

      <RuleBand height={24} />

      {/* CTA pair */}
      <section className={`${WRAP} py-14 text-center`}>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/book" className="no-underline hover:no-underline">
              {t("cta")}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/contact" className="no-underline hover:no-underline">
              {t("ctaSecondary")}
            </Link>
          </Button>
        </div>
        <p className="mt-5 font-mono text-[11px] text-muted-foreground/80">
          {t("draftNote")}
        </p>
      </section>
    </main>
  );
}
