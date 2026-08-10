import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { use } from "react";

export default function PricingPage({ params }: PageProps<"/[locale]/pricing">) {
  const { locale } = use(params);
  setRequestLocale(locale);

  const t = useTranslations("Pricing");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-4 text-muted-foreground">{t("placeholder")}</p>
    </main>
  );
}
