import { getTranslations, setRequestLocale } from "next-intl/server";
import { GcalConnect } from "@/components/admin/gcal-connect";
import { SettingsForm } from "@/components/admin/settings-form";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSettingsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select(
      "buffer_minutes, cancellation_cutoff_hours, booking_notice_hours, travel_fee_cents, travel_fee_threshold_km, gcal_refresh_token, gcal_sync_error"
    )
    .single();

  const t = await getTranslations("AdminSettings");

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {settings && (
        // Explicit field pick: the encrypted token must not serialize to the client.
        <SettingsForm
          settings={{
            buffer_minutes: settings.buffer_minutes,
            cancellation_cutoff_hours: settings.cancellation_cutoff_hours,
            booking_notice_hours: settings.booking_notice_hours,
            travel_fee_cents: settings.travel_fee_cents,
            travel_fee_threshold_km: settings.travel_fee_threshold_km,
          }}
        />
      )}
      {settings && (
        <GcalConnect
          connected={settings.gcal_refresh_token !== null}
          broken={settings.gcal_sync_error !== null}
          justConnected={query.gcal === "connected"}
          callbackError={
            typeof query.gcal_error === "string" ? query.gcal_error : null
          }
        />
      )}
    </main>
  );
}
