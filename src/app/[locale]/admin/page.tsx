import { getTranslations, setRequestLocale } from "next-intl/server";
import { RequestCard, type RequestItem } from "@/components/admin/request-card";
import { euros, formatLessonDate } from "@/lib/booking/format";
import { createClient } from "@/lib/supabase/server";

export default async function AdminRequestsPage({
  params,
}: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // Lapsed pending requests (start time passed) are ignored, per spec.
  const [{ data: pendingBookings }, { data: pendingSeries }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, starts_at, attendee_names, address, price_estimate_cents, services(title_pt, title_en), profiles(name)"
        )
        .eq("status", "pending")
        .is("series_id", null)
        .gt("starts_at", nowIso)
        .order("starts_at"),
      supabase
        .from("booking_series")
        .select(
          "id, weekday, start_time, attendee_names, address, services(title_pt, title_en), profiles(name)"
        )
        .eq("status", "pending"),
    ]);

  const t = await getTranslations("AdminRequests");
  const tDash = await getTranslations("Dashboard");

  const items: RequestItem[] = [
    ...(pendingSeries ?? []).map((s) => {
      const service = s.services as unknown as { title_pt: string };
      const profile = s.profiles as unknown as { name: string };
      return {
        kind: "series" as const,
        id: s.id,
        studentName: profile.name,
        serviceTitle: service.title_pt,
        when: tDash("seriesLabel", {
          weekday: tDash(`weekdays.${s.weekday}`),
          time: s.start_time.slice(0, 5),
        }),
        attendees: (s.attendee_names as string[]).length,
        address: s.address,
        estimate: "—",
      };
    }),
    ...(pendingBookings ?? []).map((b) => {
      const service = b.services as unknown as { title_pt: string };
      const profile = b.profiles as unknown as { name: string };
      return {
        kind: "booking" as const,
        id: b.id,
        studentName: profile.name,
        serviceTitle: service.title_pt,
        when: formatLessonDate(locale, b.starts_at),
        attendees: (b.attendee_names as string[]).length,
        address: b.address,
        estimate: euros(b.price_estimate_cents),
      };
    }),
  ];

  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((item) => (
            <RequestCard key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </ul>
      )}
    </main>
  );
}
