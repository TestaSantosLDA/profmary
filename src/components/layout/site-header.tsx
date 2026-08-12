import { MessageSquare } from "lucide-react";
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

export function SiteHeader({
  role,
  messagesUnread = 0,
}: {
  role: SessionRole;
  messagesUnread?: number;
}) {
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
          {/* Guests keep a sign-in entry at every width — the mobile
              BottomNav only covers the signed-in session entries. */}
          {role === "guest" && (
            <span className="text-sm">
              <NavLink href="/login">{tAuth("signIn")}</NavLink>
            </span>
          )}
          <span className="hidden items-center gap-4 text-sm min-[720px]:flex">
            {role === "client" && (
              <NavLink href="/dashboard">{t("dashboard")}</NavLink>
            )}
            {role === "admin" && <NavLink href="/admin">{t("admin")}</NavLink>}
            {role !== "guest" && (
              <NavLink href="/profile">{t("profile")}</NavLink>
            )}
          </span>
          {role !== "guest" && (
            <Link
              href={role === "admin" ? "/admin/messages" : "/messages"}
              aria-label={t("messages")}
              className="relative flex size-[38px] items-center justify-center rounded-[10px] border border-border text-foreground no-underline transition-colors hover:text-primary"
            >
              <MessageSquare className="size-5" strokeWidth={1.6} />
              {messagesUnread > 0 && (
                <span className="absolute -right-[5px] -top-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                  {messagesUnread}
                </span>
              )}
            </Link>
          )}
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
