import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { requireAdmin } from "@/lib/auth/require-admin";

const ADMIN_NAV = [
  { href: "/admin", key: "requests" },
  { href: "/admin/bookings", key: "bookings" },
  { href: "/admin/services", key: "services" },
  { href: "/admin/availability", key: "availability" },
  { href: "/admin/about", key: "about" },
  { href: "/admin/settings", key: "settings" },
] as const;

export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const t = await getTranslations("Admin.nav");
  const tCommon = await getTranslations("Common");

  return (
    <div className="mx-auto w-full max-w-[1040px] flex-1 px-4 py-8">
      <div className="mb-5 flex items-center justify-between">
        <p className="font-heading text-lg font-semibold">
          ProfMary <span className="font-sans text-sm font-normal text-muted-foreground">· admin</span>
        </p>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">
            {tCommon("signOut")}
          </Button>
        </form>
      </div>
      <div className="mb-8 border-b pb-4">
        <AdminTabs
          items={ADMIN_NAV.map(({ href, key }) => ({ href, label: t(key) }))}
        />
      </div>
      {children}
    </div>
  );
}
