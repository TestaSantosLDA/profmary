import { getTranslations, setRequestLocale } from "next-intl/server";
import { ServiceForm } from "@/components/admin/service-form";
import { globalFeeLabel } from "@/lib/admin/global-fee";

export default async function NewServicePage({
  params,
}: PageProps<"/[locale]/admin/services/new">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminServices");

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">{t("newService")}</h1>
      <ServiceForm globalFeeLabel={await globalFeeLabel()} />
    </main>
  );
}
