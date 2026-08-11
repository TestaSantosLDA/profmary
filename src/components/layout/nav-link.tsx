"use client";

import { Link, usePathname } from "@/i18n/navigation";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={
        active
          ? "font-semibold text-primary no-underline"
          : "text-muted-foreground no-underline hover:text-foreground hover:no-underline"
      }
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
