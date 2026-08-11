import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ServiceForm, type ServiceRow } from "@/components/admin/service-form";
import { globalFeeLabel } from "@/lib/admin/global-fee";
import { createClient } from "@/lib/supabase/server";

export default async function EditServicePage({
  params,
}: PageProps<"/[locale]/admin/services/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const [{ data: service }, { data: packs }] = await Promise.all([
    supabase
      .from("services")
      .select("id, title_pt, title_en, description_pt, description_en, hourly_rate_cents, min_duration_minutes, max_duration_minutes, attendee_cap, active, allows_online, allows_onsite, onsite_fee_override_cents")
      .eq("id", id)
      .single<ServiceRow>(),
    supabase
      .from("packs")
      .select("id, lessons, price_per_lesson_cents, validity_months")
      .eq("service_id", id)
      .eq("active", true)
      .order("lessons"),
  ]);

  if (!service) {
    notFound();
  }

  const t = await getTranslations("AdminServices");

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">{t("editService")}</h1>
      <ServiceForm
        service={service}
        packs={packs ?? []}
        globalFeeLabel={await globalFeeLabel()}
      />
    </main>
  );
}
