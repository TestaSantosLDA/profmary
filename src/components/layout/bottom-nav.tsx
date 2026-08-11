"use client";

import { CalendarDays, Euro, House, Mail, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  { href: "/", key: "home", Icon: House },
  { href: "/pricing", key: "pricing", Icon: Euro },
  { href: "/about", key: "about", Icon: UserRound },
  { href: "/contact", key: "contact", Icon: Mail },
] as const;

export function BottomNav({ loggedIn }: { loggedIn: boolean }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  // The admin panel has its own tabs.
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const items = loggedIn
    ? [
        ...ITEMS,
        { href: "/dashboard", key: "dashboardShort", Icon: CalendarDays } as const,
      ]
    : ITEMS;

  return (
    <nav className="sticky bottom-0 z-20 flex justify-around border-t border-border bg-card pb-[env(safe-area-inset-bottom)] min-[720px]:hidden">
      {items.map(({ href, key, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 max-w-22 flex-1 flex-col items-center justify-center gap-0.5 rounded-[10px] py-1.5 no-underline hover:no-underline ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-[22px]" strokeWidth={2} />
            <span
              className={`text-[11px] ${active ? "font-semibold" : "font-medium"}`}
            >
              {t(key)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
