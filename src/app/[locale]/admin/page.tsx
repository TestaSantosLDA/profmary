import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function AdminRequestsPage({
  params,
}: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");

  return (
    <main>
      <h1 className="text-2xl font-bold">{t("nav.requests")}</h1>
      <p className="mt-4 text-muted-foreground">{t("requestsPlaceholder")}</p>
    </main>
  );
}
