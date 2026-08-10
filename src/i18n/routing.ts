import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
});

export type AppLocale = (typeof routing.locales)[number];
