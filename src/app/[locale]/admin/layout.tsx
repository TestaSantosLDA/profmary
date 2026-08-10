import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";

const ADMIN_NAV = [
  { href: "/admin", key: "requests" },
  { href: "/admin/bookings", key: "bookings" },
  { href: "/admin/services", key: "services" },
  { href: "/admin/availability", key: "availability" },
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

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <nav className="mb-8 flex flex-wrap gap-2 border-b pb-4 text-sm">
        {ADMIN_NAV.map(({ href, key }) => (
          <Link
            key={key}
            href={href}
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {t(key)}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
