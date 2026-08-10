import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ServiceForm, type ServiceRow } from "@/components/admin/service-form";
import { createClient } from "@/lib/supabase/server";

export default async function EditServicePage({
  params,
}: PageProps<"/[locale]/admin/services/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, title_pt, title_en, description_pt, description_en, hourly_rate_cents, min_duration_minutes, max_duration_minutes, attendee_cap, active")
    .eq("id", id)
    .single<ServiceRow>();

  if (!service) {
    notFound();
  }

  const t = await getTranslations("AdminServices");

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">{t("editService")}</h1>
      <ServiceForm service={service} />
    </main>
  );
}
