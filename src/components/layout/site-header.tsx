import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { SessionRole } from "./bottom-nav";
import { LanguageSwitcher } from "./language-switcher";
import { NavLink } from "./nav-link";

const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/pricing", key: "pricing" },
  { href: "/contact", key: "contact" },
] as const;

export function SiteHeader({ role }: { role: SessionRole }) {
  const t = useTranslations("Nav");
  const tCommon = useTranslations("Common");
  const tAuth = useTranslations("Auth");

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-[1040px] items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="font-heading text-xl font-semibold text-foreground no-underline hover:text-foreground hover:no-underline"
        >
          {tCommon("appName")}
        </Link>
        <nav className="hidden gap-6 text-sm min-[720px]:flex">
          {NAV_ITEMS.map(({ href, key }) => (
            <NavLink key={key} href={href}>
              {t(key)}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {/* On mobile the BottomNav covers the session entries. */}
          <span className="hidden items-center gap-4 text-sm min-[720px]:flex">
            {role === "guest" && (
              <NavLink href="/login">{tAuth("signIn")}</NavLink>
            )}
            {role === "client" && (
              <NavLink href="/dashboard">{t("dashboard")}</NavLink>
            )}
            {role === "admin" && <NavLink href="/admin">{t("admin")}</NavLink>}
            {role !== "guest" && (
              <NavLink href="/profile">{t("profile")}</NavLink>
            )}
          </span>
          <LanguageSwitcher />
          <Button asChild size="sm">
            <Link href="/book" className="no-underline hover:no-underline">
              {tCommon("bookLesson")}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
