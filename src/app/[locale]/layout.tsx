import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Geist_Mono, Lora, Source_Sans_3 } from "next/font/google";
import { notFound } from "next/navigation";
import { BottomNav, type SessionRole } from "@/components/layout/bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

const lora = Lora({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-lora",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-sans",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProfMary",
  description: "Private Portuguese lessons with Maria Martins",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  // Session role drives the header entries and the mobile tab set.
  // Reading cookies here makes the public pages render dynamically — fine
  // at this scale, per the design handoff.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let role: SessionRole = "guest";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    role = profile?.is_admin ? "admin" : "client";
  }

  return (
    <html
      lang={locale}
      className={`${lora.variable} ${sourceSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <SiteHeader role={role} />
          {children}
          <BottomNav role={role} />
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
