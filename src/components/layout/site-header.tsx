import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";

const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/pricing", key: "pricing" },
  { href: "/contact", key: "contact" },
] as const;

export function SiteHeader() {
  const t = useTranslations("Nav");
  const tCommon = useTranslations("Common");

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          {tCommon("appName")}
        </Link>
        <nav className="hidden gap-6 text-sm sm:flex">
          {NAV_ITEMS.map(({ href, key }) => (
            <Link
              key={key}
              href={href}
              className="text-muted-foreground hover:text-foreground"
            >
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/book"
            className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            {tCommon("bookLesson")}
          </Link>
        </div>
      </div>
    </header>
  );
}
