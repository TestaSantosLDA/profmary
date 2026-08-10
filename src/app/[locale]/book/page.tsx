import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { BookingForm } from "@/components/booking/booking-form";
import { createClient } from "@/lib/supabase/server";
import type { BookableService } from "@/lib/booking/queries";

export default async function BookPage({ params }: PageProps<"/[locale]/book">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const [{ data: services }, { data: profile }, { data: settings }] =
    await Promise.all([
      supabase
        .from("services")
        .select(
          "id, title_pt, title_en, description_pt, description_en, hourly_rate_cents, min_duration_minutes, max_duration_minutes, attendee_cap"
        )
        .eq("active", true)
        .order("sort_order")
        .returns<BookableService[]>(),
      supabase
        .from("profiles")
        .select("default_address")
        .eq("id", user.id)
        .single(),
      supabase.rpc("get_public_settings").single<{
        travel_fee_cents: number;
        travel_fee_threshold_km: number;
      }>(),
    ]);

  const t = await getTranslations("BookingForm");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">{t("title")}</h1>
      <p className="mb-8 text-muted-foreground">{t("subtitle")}</p>
      {(services ?? []).length === 0 ? (
        <p className="text-muted-foreground">{t("noServices")}</p>
      ) : (
        <BookingForm
          services={services ?? []}
          defaultAddress={profile?.default_address ?? ""}
          settings={settings ?? null}
        />
      )}
    </main>
  );
}
