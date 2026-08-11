import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ContentItem } from "@/components/admin/about-editor";
import { Button } from "@/components/ui/button";
import { createServiceClient } from "@/lib/supabase/server";

export const revalidate = 300;

export default async function AboutPage({
  params,
}: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createServiceClient();
  const { data: content } = await supabase
    .from("site_content")
    .select(
      "photo_url, display_name, tagline_pt, tagline_en, intro_pt, intro_en, highlights, steps"
    )
    .eq("key", "about")
    .single();

  const t = await getTranslations("AboutPage");
  // Each field falls back to the other locale, then to the i18n copy.
  const pick = (pt: string, en: string) => (locale === "pt" ? pt || en : en || pt);
  const tagline =
    pick(content?.tagline_pt ?? "", content?.tagline_en ?? "") ||
    t("taglineFallback");
  const intro =
    pick(content?.intro_pt ?? "", content?.intro_en ?? "") || t("introFallback");

  const highlights = (content?.highlights ?? []) as ContentItem[];
  const steps: { title: string; body: string }[] = (
    (content?.steps ?? []) as ContentItem[]
  ).map((s) => ({ title: pick(s.title_pt, s.title_en), body: pick(s.body_pt, s.body_en) }));
  if (steps.length === 0) {
    for (const n of [1, 2, 3] as const) {
      steps.push({ title: t(`steps.${n}.title`), body: t(`steps.${n}.body`) });
    }
  }

  return (
    <main className="mx-auto w-full max-w-[640px] flex-1 px-4 py-12">
      <h1 className="text-3xl">{t("title")}</h1>

      <div className="mt-8 flex items-center gap-5">
        {content?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.photo_url}
            alt={t("photoAlt")}
            className="size-32 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="size-32 shrink-0 rounded-full border border-border bg-[repeating-linear-gradient(45deg,#EAF0F8,#EAF0F8_8px,#F1EDE6_8px,#F1EDE6_16px)]"
          />
        )}
        <div>
          <p className="font-heading text-xl font-semibold">
            {content?.display_name || "Maria Martins"}
          </p>
          <p className="text-primary">{tagline}</p>
        </div>
      </div>

      <p className="mt-6 max-w-[58ch] text-base">{intro}</p>

      <h2 className="mt-12 text-xl">{t("audienceTitle")}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {highlights.length > 0
          ? highlights.map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-heading text-base font-semibold">
                  {pick(item.title_pt, item.title_en)}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {pick(item.body_pt, item.body_en)}
                </p>
              </div>
            ))
          : (["international", "exam"] as const).map((k) => (
              <div key={k} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-heading text-base font-semibold">
                  {t(`audience.${k}.title`)}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t(`audience.${k}.body`)}
                </p>
              </div>
            ))}
      </div>

      <h2 className="mt-12 text-xl">{t("howTitle")}</h2>
      <ol className="mt-4 space-y-4">
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

      <div className="mt-12 rounded-xl border border-border bg-card p-8 text-center">
        <p className="font-heading text-lg font-semibold">{t("ctaTitle")}</p>
        <Button asChild className="mt-4">
          <Link href="/book" className="no-underline hover:no-underline">
            {t("cta")}
          </Link>
        </Button>
      </div>
    </main>
  );
}
