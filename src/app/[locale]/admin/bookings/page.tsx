import { getTranslations, setRequestLocale } from "next-intl/server";
import { StatusBadge } from "@/components/dashboard/cancel-button";
import { euros, formatLessonDate } from "@/lib/booking/format";
import { createClient } from "@/lib/supabase/server";

const LISBON = "Europe/Lisbon";

export default async function AdminBookingsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/bookings">) {
  const { locale } = await params;
  const { status } = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  let listQuery = supabase
    .from("bookings")
    .select(
      "id, starts_at, status, address, price_estimate_cents, attendee_names, travel_fee_applied, services(title_pt), profiles(name, phone, email)"
    )
    .gt("starts_at", nowIso)
    .order("starts_at")
    .limit(100);

  if (typeof status === "string" && status) {
    listQuery = listQuery.eq("status", status);
  }

  const [{ data: week }, { data: list }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, starts_at, address, attendee_names, services(title_pt), profiles(name)")
      .eq("status", "confirmed")
      .gt("starts_at", nowIso)
      .lte("starts_at", weekEnd)
      .order("starts_at"),
    listQuery,
  ]);

  const t = await getTranslations("AdminBookings");

  const dayKey = (iso: string) =>
    new Intl.DateTimeFormat("pt-PT", {
      timeZone: LISBON,
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(iso));

  const time = (iso: string) =>
    new Intl.DateTimeFormat("pt-PT", {
      timeZone: LISBON,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const byDay = new Map<string, NonNullable<typeof week>>();
  for (const b of week ?? []) {
    const key = dayKey(b.starts_at);
    byDay.set(key, [...(byDay.get(key) ?? []), b]);
  }

  const STATUSES = [
    "",
    "pending",
    "confirmed",
    "cancelled_student",
    "cancelled_admin",
    "skipped_blockout",
  ];

  return (
    <main className="space-y-10">
      <section>
        <h1 className="mb-4 text-2xl font-bold">{t("weekTitle")}</h1>
        {byDay.size === 0 && (
          <p className="text-muted-foreground">{t("weekEmpty")}</p>
        )}
        <div className="space-y-4">
          {[...byDay.entries()].map(([day, lessons]) => (
            <div key={day}>
              <h2 className="mb-2 font-semibold capitalize">{day}</h2>
              <ul className="divide-y rounded-md border">
                {lessons.map((b) => {
                  const service = b.services as unknown as { title_pt: string };
                  const profile = b.profiles as unknown as { name: string };
                  return (
                    <li key={b.id} className="px-4 py-2 text-sm">
                      <span className="font-medium">{time(b.starts_at)}</span> ·{" "}
                      {profile.name} · {service.title_pt} ·{" "}
                      <span className="text-muted-foreground">{b.address}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{t("allTitle")}</h2>
          <form method="get" className="flex items-center gap-2 text-sm">
            <select
              name="status"
              defaultValue={typeof status === "string" ? status : ""}
              className="border-input h-9 rounded-md border bg-transparent px-3"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s ? t(`statuses.${s}`) : t("allStatuses")}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-md border px-3 py-1.5">
              {t("filter")}
            </button>
          </form>
        </div>
        <ul className="divide-y rounded-md border">
          {(list ?? []).map((b) => {
            const service = b.services as unknown as { title_pt: string };
            const profile = b.profiles as unknown as {
              name: string;
              phone: string | null;
              email: string;
            };
            return (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    {formatLessonDate(locale, b.starts_at)} · {profile.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {service.title_pt} ·{" "}
                    {euros(b.price_estimate_cents)}
                    {b.travel_fee_applied && ` (${t("withTravelFee")})`} ·{" "}
                    {b.address}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {profile.email}
                    {profile.phone && ` · ${profile.phone}`}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </li>
            );
          })}
          {(list ?? []).length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("listEmpty")}
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
