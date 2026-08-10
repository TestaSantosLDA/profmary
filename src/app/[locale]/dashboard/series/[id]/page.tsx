import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import {
  CancelButton,
  StatusBadge,
} from "@/components/dashboard/cancel-button";
import { cancelBooking, cancelSeries } from "@/lib/booking/actions";
import { formatLessonDate } from "@/lib/booking/format";
import { createClient } from "@/lib/supabase/server";

export default async function SeriesPage({
  params,
}: PageProps<"/[locale]/dashboard/series/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const [{ data: series }, { data: occurrences }, { data: settings }] =
    await Promise.all([
      supabase
        .from("booking_series")
        .select("id, weekday, start_time, status, end_date, services(title_pt, title_en)")
        .eq("id", id)
        .single<{
          id: string;
          weekday: number;
          start_time: string;
          status: string;
          end_date: string | null;
          services: { title_pt: string; title_en: string };
        }>(),
      supabase
        .from("bookings")
        .select("id, starts_at, status")
        .eq("series_id", id)
        .order("starts_at"),
      supabase.rpc("get_public_settings").single<{
        cancellation_cutoff_hours: number;
      }>(),
    ]);

  if (!series) {
    notFound();
  }

  const t = await getTranslations("Dashboard");
  const cutoffMs =
    (settings?.cancellation_cutoff_hours ?? 24) * 60 * 60 * 1000;
  const nowIso = new Date().toISOString();
  const future = (occurrences ?? []).filter((o) => o.starts_at > nowIso);

  const canCancelOccurrence = (o: { starts_at: string; status: string }) =>
    o.status === "pending" ||
    (o.status === "confirmed" &&
      new Date(o.starts_at).getTime() - Date.now() > cutoffMs);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {locale === "pt" ? series.services.title_pt : series.services.title_en}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {t("seriesLabel", {
              weekday: t(`weekdays.${series.weekday}`),
              time: series.start_time.slice(0, 5),
            })}{" "}
            ·{" "}
            {series.end_date
              ? t("seriesUntil", { date: series.end_date })
              : t("seriesOpenEnded")}
          </p>
        </div>
        {["pending", "active"].includes(series.status) && (
          <CancelButton
            action={cancelSeries}
            id={series.id}
            label={t("cancelSeries")}
            confirmMessage={t("cancelSeriesConfirm")}
          />
        )}
      </div>

      <ul className="divide-y rounded-md border">
        {future.map((o) => (
          <li
            key={o.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
          >
            <span>{formatLessonDate(locale, o.starts_at)}</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={o.status} />
              {canCancelOccurrence(o) && (
                <CancelButton
                  action={cancelBooking}
                  id={o.id}
                  label={t("cancel")}
                  confirmMessage={t("cancelConfirm")}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
