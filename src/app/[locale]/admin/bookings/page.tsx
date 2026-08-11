import { getTranslations, setRequestLocale } from "next-intl/server";
import { StatusBadge } from "@/components/dashboard/cancel-button";
import {
  PackCancelPanel,
  type PackCancelItem,
} from "@/components/admin/pack-cancel-panel";
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

  const [{ data: week }, { data: list }, { data: cancelledPack }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id, starts_at, address, attendee_names, services(title_pt), profiles(name)")
        .eq("status", "confirmed")
        .gt("starts_at", nowIso)
        .lte("starts_at", weekEnd)
        .order("starts_at"),
      listQuery,
      supabase
        .from("bookings")
        .select("id, starts_at, services(title_pt), profiles(name)")
        .in("status", ["cancelled_student", "cancelled_admin"])
        .not("paid_with_pack_purchase_id", "is", null)
        .order("starts_at", { ascending: false })
        .limit(50),
    ]);

  // Only cancellations whose credit was actually spent and not yet ruled on
  // need Maria's decision (pending withdrawals refund automatically).
  const cancelledIds = (cancelledPack ?? []).map((b) => b.id);
  const { data: ledgerRows } = cancelledIds.length
    ? await supabase
        .from("pack_ledger")
        .select("booking_id, reason")
        .in("booking_id", cancelledIds)
    : { data: [] };
  const spent = new Set(
    (ledgerRows ?? []).filter((l) => l.reason === "lesson").map((l) => l.booking_id)
  );
  const ruled = new Set(
    (ledgerRows ?? [])
      .filter((l) => l.reason === "cancel_refund" || l.reason === "cancel_consume")
      .map((l) => l.booking_id)
  );
  const packCancelItems: PackCancelItem[] = (cancelledPack ?? [])
    .filter((b) => spent.has(b.id) && !ruled.has(b.id))
    .map((b) => ({
      bookingId: b.id,
      studentName: (b.profiles as unknown as { name: string }).name,
      serviceTitle: (b.services as unknown as { title_pt: string }).title_pt,
      when: formatLessonDate(locale, b.starts_at),
    }));

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
      <PackCancelPanel items={packCancelItems} />
      <section>
        <h1 className="mb-4 text-2xl font-bold">{t("weekTitle")}</h1>
        {byDay.size === 0 && (
          <p className="text-muted-foreground">{t("weekEmpty")}</p>
        )}
        <div className="space-y-4">
          {[...byDay.entries()].map(([day, lessons]) => (
            <div key={day}>
              <h2 className="mb-2 font-heading text-[1.05rem] font-semibold">
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </h2>
              <ul className="divide-y rounded-xl border border-border bg-card">
                {lessons.map((b) => {
                  const service = b.services as unknown as { title_pt: string };
                  const profile = b.profiles as unknown as { name: string };
                  return (
                    <li key={b.id} className="px-4 py-2.5 text-sm">
                      <span className="font-semibold">{time(b.starts_at)}</span>{" "}
                      · {profile.name} · {service.title_pt} ·{" "}
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
              className="border-input h-9 rounded-[10px] border bg-card px-3"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s ? t(`statuses.${s}`) : t("allStatuses")}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 rounded-[10px] border border-border bg-card px-3.5 font-medium transition-colors hover:bg-muted"
            >
              {t("filter")}
            </button>
          </form>
        </div>
        <ul className="divide-y rounded-xl border border-border bg-card">
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
