import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/media/photo";
import { Button } from "@/components/ui/button";
import { RuleBand } from "@/components/ui/rule-band";
import {
  normalizeAbout,
  normalizeHome,
  type MediaMap,
} from "@/lib/content/page-content";
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
  const [{ data: pages }, { data: mediaRows }] = await Promise.all([
    supabase
      .from("page_content")
      .select("page, content")
      .in("page", ["home", "about"])
      .returns<{ page: string; content: unknown }[]>(),
    supabase.from("media").select("slot, url"),
  ]);

  const content = normalizeAbout(pages?.find((p) => p.page === "about")?.content);
  // The audience cards are edited once, on the Home editor, and shown on both
  // pages.
  const homeContent = normalizeHome(pages?.find((p) => p.page === "home")?.content);
  const media: MediaMap = Object.fromEntries(
    (mediaRows ?? []).map((r) => [r.slot, r.url])
  );

  const t = await getTranslations("AboutPage");
  const tHome = await getTranslations("Home");

  // Empty EN falls back to PT; empty PT falls back to the i18n launch copy.
  const pick = (pt: string, en: string) => (locale === "pt" ? pt || en : en || pt);
  const tagline =
    pick(content.hero.tagline_pt, content.hero.tagline_en) || t("taglineFallback");

  const paragraphs = [
    pick(content.hero.p1_pt, content.hero.p1_en),
    pick(content.hero.p2_pt, content.hero.p2_en),
  ].filter(Boolean);
  if (paragraphs.length === 0) {
    paragraphs.push(t("introFallback1"), t("introFallback2"));
  }

  const facts = content.facts.items.map((f) => ({
    value: f.value,
    caption: pick(f.caption_pt, f.caption_en),
  }));
  if (facts.length === 0) {
    for (const n of [1, 2, 3] as const) {
      facts.push({ value: t(`facts.${n}.value`), caption: t(`facts.${n}.caption`) });
    }
  }

  const audiences = homeContent.audiences.items.map((h) => ({
    title: pick(h.title_pt, h.title_en),
    body: pick(h.body_pt, h.body_en),
  }));
  if (audiences.length === 0) {
    for (const k of ["international", "exam"] as const) {
      audiences.push({
        title: tHome(`audience.${k}.title`),
        body: tHome(`audience.${k}.body`),
      });
    }
  }

  const closeTitle = pick(content.close.title_pt, content.close.title_en);

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className={`${WRAP} py-14 min-[880px]:py-20`}>
        <div className="grid items-center gap-12 min-[880px]:grid-cols-[0.9fr_1.1fr]">
          <Photo
            src={media.about_portrait}
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
              {content.hero.name || "Maria Martins"}
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
              {facts.map((fact, i) => (
                <li key={i}>
                  <span className="font-heading text-xl font-semibold">
                    {fact.value}
                  </span>{" "}
                  <span className="text-[13px] text-muted-foreground">
                    {fact.caption}
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
          <h2 className="text-2xl">
            {pick(homeContent.audiences.title_pt, homeContent.audiences.title_en) ||
              t("audienceTitle")}
          </h2>
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
        <h2 className="text-2xl">
          {pick(content.lessons.title_pt, content.lessons.title_en) ||
            t("lessonsTitle")}
        </h2>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {STRIP.map(({ note, search }, i) => (
            <Photo
              key={note}
              src={media[`about_strip_${i + 1}`]}
              alt=""
              ratio="1/1"
              note={t(note)}
              search={search}
            />
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-[44ch] text-center font-heading text-[21px] leading-normal">
          {pick(content.lessons.closing_pt, content.lessons.closing_en) ||
            t("lessonsClosing")}
        </p>
      </section>

      <RuleBand height={24} />

      {/* CTA pair */}
      <section className={`${WRAP} py-14 text-center`}>
        {closeTitle && <h2 className="text-balance text-[1.7rem]">{closeTitle}</h2>}
        <div className={`flex flex-wrap justify-center gap-3 ${closeTitle ? "mt-6" : ""}`}>
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
