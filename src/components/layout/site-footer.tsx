import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("Footer");

  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-[1040px] flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>{t("copyright", { year: new Date().getFullYear() })}</p>
        <Link href="/privacy" className="hover:text-foreground">
          {t("privacyPolicy")}
        </Link>
      </div>
    </footer>
  );
}
