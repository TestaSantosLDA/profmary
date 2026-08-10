import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { use } from "react";
import { Link } from "@/i18n/navigation";

export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale);

  const t = useTranslations("Home");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">{t("title")}</h1>
      <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="rounded-md bg-foreground px-6 py-3 text-background font-medium"
        >
          {t("ctaPrimary")}
        </Link>
        <Link href="/" className="rounded-md border px-6 py-3 font-medium">
          {t("ctaSecondary")}
        </Link>
      </div>
    </main>
  );
}
