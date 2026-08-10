"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center gap-1 text-sm">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          className={
            l === locale
              ? "rounded px-2 py-1 font-semibold underline underline-offset-4"
              : "rounded px-2 py-1 text-muted-foreground hover:text-foreground"
          }
          aria-current={l === locale ? "true" : undefined}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
