import { getTranslations, setRequestLocale } from "next-intl/server";
import { SettingsForm } from "@/components/admin/settings-form";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSettingsPage({
  params,
}: PageProps<"/[locale]/admin/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("buffer_minutes, cancellation_cutoff_hours, booking_notice_hours, travel_fee_cents, travel_fee_threshold_km")
    .single();

  const t = await getTranslations("AdminSettings");

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {settings && <SettingsForm settings={settings} />}
    </main>
  );
}
