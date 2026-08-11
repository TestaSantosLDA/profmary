"use client";

import {
  CalendarDays,
  Euro,
  House,
  Inbox,
  Mail,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export type SessionRole = "guest" | "client" | "admin";

// The tab set swaps with the session instead of growing past 4 tabs:
// guests get the marketing pages, signed-in users their own areas.
const TABS = {
  guest: [
    { href: "/", key: "home", Icon: House },
    { href: "/pricing", key: "pricing", Icon: Euro },
    { href: "/about", key: "about", Icon: UserRound },
    { href: "/contact", key: "contact", Icon: Mail },
  ],
  client: [
    { href: "/", key: "home", Icon: House },
    { href: "/dashboard", key: "dashboardShort", Icon: CalendarDays },
    { href: "/pricing", key: "pricing", Icon: Euro },
    { href: "/profile", key: "profileShort", Icon: UserRound },
  ],
  admin: [
    { href: "/", key: "home", Icon: House },
    { href: "/admin", key: "adminShort", Icon: Inbox },
    { href: "/pricing", key: "pricing", Icon: Euro },
    { href: "/profile", key: "profileShort", Icon: UserRound },
  ],
} as const;

export function BottomNav({ role }: { role: SessionRole }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  // The admin panel has its own tabs.
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <nav className="sticky bottom-0 z-20 flex justify-around border-t border-border bg-card pb-[env(safe-area-inset-bottom)] min-[720px]:hidden">
      {TABS[role].map(({ href, key, Icon }) => {
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
