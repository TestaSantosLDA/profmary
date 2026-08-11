"use client";

import { Link, usePathname } from "@/i18n/navigation";

export function AdminTabs({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {items.map(({ href, label }) => {
        const active =
          href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={[
              "rounded-full border px-3.5 py-2 text-[13px] font-medium no-underline transition-colors hover:no-underline",
              active
                ? "border-primary bg-secondary text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
