import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { use } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { TileBand } from "@/components/ui/tile-band";

export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale);

  const t = useTranslations("Home");

  return (
    <main className="flex flex-1 flex-col">
      <TileBand height={12} />
      <section className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <h1 className="text-[clamp(2.2rem,5vw,3.5rem)] leading-tight">
          {t("title")}
        </h1>
        <p className="max-w-[52ch] text-[17px] text-muted-foreground">
          {t("subtitle")}
        </p>
        <div className="flex w-full max-w-[300px] flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:gap-4">
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
      </section>
    </main>
  );
}
