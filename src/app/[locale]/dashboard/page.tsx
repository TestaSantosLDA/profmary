import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import {
  CancelButton,
  StatusBadge,
} from "@/components/dashboard/cancel-button";
import { Button } from "@/components/ui/button";
import { cancelBooking } from "@/lib/booking/actions";
import { euros, formatLessonDate } from "@/lib/booking/format";
import { createClient } from "@/lib/supabase/server";

type BookingRow = {
  id: string;
  starts_at: string;
  status: string;
  address: string;
  mode: "online" | "onsite";
  price_estimate_cents: number;
  attendee_names: string[];
  series_id: string | null;
  services: { title_pt: string; title_en: string };
};

type SeriesRow = {
  id: string;
  weekday: number;
  start_time: string;
  status: string;
  end_date: string | null;
  services: { title_pt: string; title_en: string };
};

export default async function DashboardPage({
  params,
  searchParams,
}: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  const { requested } = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const nowIso = new Date().toISOString();
  const [{ data: bookings }, { data: series }, { data: settings }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, starts_at, status, address, mode, price_estimate_cents, attendee_names, series_id, services(title_pt, title_en)"
        )
        .eq("user_id", user.id)
        .order("starts_at", { ascending: true })
        .returns<BookingRow[]>(),
      supabase
        .from("booking_series")
        .select("id, weekday, start_time, status, end_date, services(title_pt, title_en)")
        .eq("user_id", user.id)
        .in("status", ["pending", "active"])
        .returns<SeriesRow[]>(),
      supabase.rpc("get_public_settings").single<{
        cancellation_cutoff_hours: number;
      }>(),
    ]);

  const t = await getTranslations("Dashboard");
  const cutoffMs =
    (settings?.cancellation_cutoff_hours ?? 24) * 60 * 60 * 1000;
  const title = (b: { services: { title_pt: string; title_en: string } }) =>
    locale === "pt" ? b.services.title_pt : b.services.title_en;

  const all = bookings ?? [];
  const pendingOneOffs = all.filter(
    (b) => b.status === "pending" && !b.series_id && b.starts_at > nowIso
  );
  const upcoming = all.filter(
    (b) =>
      b.starts_at > nowIso &&
      (b.status === "confirmed" || b.status === "skipped_blockout")
  );
  const past = all
    .filter((b) => b.starts_at <= nowIso)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    .slice(0, 10);

  const canCancel = (b: BookingRow) =>
    b.status === "pending" ||
    (b.status === "confirmed" &&
      new Date(b.starts_at).getTime() - Date.now() > cutoffMs);

  const modePill = (b: BookingRow) => (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        b.mode === "onsite"
          ? "bg-accent-tint text-accent"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {t(b.mode === "onsite" ? "modeOnsite" : "modeOnline")}
    </span>
  );

  const bookingLine = (b: BookingRow, showCancel: boolean) => (
    <li
      key={b.id}
      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
    >
      <div>
        <p className="font-medium">
          {title(b)}{" "}
          <span className="text-muted-foreground">
            · {formatLessonDate(locale, b.starts_at)}
          </span>
          {modePill(b)}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("attendees", { count: b.attendee_names.length })} ·{" "}
          {euros(b.price_estimate_cents)}
          {b.mode === "onsite" && ` · ${b.address}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={b.status} />
        {showCancel &&
          (canCancel(b) ? (
            <CancelButton
              action={cancelBooking}
              id={b.id}
              label={t("cancel")}
              confirmMessage={t("cancelConfirm")}
            />
          ) : (
            b.status === "confirmed" && (
              <span className="text-xs text-muted-foreground">
                {t("insideCutoff")}
              </span>
            )
          ))}
      </div>
    </li>
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <Button asChild>
          <Link href="/book">{t("bookLesson")}</Link>
        </Button>
      </div>

      {requested && (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t("requested")}
        </p>
      )}

      {all.length === 0 && (series ?? []).length === 0 && (
        <p className="text-muted-foreground">{t("empty")}</p>
      )}

      {pendingOneOffs.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">{t("pendingRequests")}</h2>
          <ul className="divide-y rounded-md border">
            {pendingOneOffs.map((b) => bookingLine(b, true))}
          </ul>
        </section>
      )}

      {(series ?? []).length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">{t("series")}</h2>
          <ul className="divide-y rounded-md border">
            {(series ?? []).map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{title(s)}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("seriesLabel", {
                      weekday: t(`weekdays.${s.weekday}`),
                      time: s.start_time.slice(0, 5),
                    })}{" "}
                    ·{" "}
                    {s.end_date
                      ? t("seriesUntil", { date: s.end_date })
                      : t("seriesOpenEnded")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={s.status === "active" ? "confirmed" : s.status}
                  />
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/series/${s.id}`}>
                      {t("viewSeries")}
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">{t("upcoming")}</h2>
          <ul className="divide-y rounded-md border">
            {upcoming.map((b) => bookingLine(b, true))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">{t("past")}</h2>
          <ul className="divide-y rounded-md border">
            {past.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    {title(b)}{" "}
                    <span className="text-muted-foreground">
                      · {formatLessonDate(locale, b.starts_at)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={b.status} />
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/book?again=${b.id}`}>{t("bookAgain")}</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
