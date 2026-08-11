import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { use } from "react";

const SECTIONS = [
  "controller",
  "data",
  "minors",
  "addresses",
  "use",
  "processors",
  "retention",
  "rights",
  "cookies",
  "changes",
] as const;

export default function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = use(params);
  setRequestLocale(locale);

  const t = useTranslations("Privacy");

  return (
    <main className="mx-auto w-full max-w-[640px] flex-1 px-4 py-12">
      <h1 className="text-3xl">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("updated")}</p>
      <p className="mt-6">{t("intro")}</p>

      {SECTIONS.map((key) => (
        <section key={key}>
          <h2 className="mt-10 text-xl">{t(`sections.${key}.title`)}</h2>
          <p className="mt-3 whitespace-pre-line text-base">
            {t(`sections.${key}.body`)}
          </p>
        </section>
      ))}
    </main>
  );
}
