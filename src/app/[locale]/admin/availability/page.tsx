import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AvailabilityEditor,
  type Rule,
} from "@/components/admin/availability-editor";
import { BlockoutCalendar } from "@/components/admin/blockout-calendar";
import { Button } from "@/components/ui/button";
import { deleteBlockout } from "@/lib/admin/availability-actions";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAvailabilityPage({
  params,
}: PageProps<"/[locale]/admin/availability">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const [{ data: rules }, { data: blockouts }] = await Promise.all([
    supabase
      .from("availability_rules")
      .select("id, weekday, start_time, end_time")
      .order("weekday")
      .order("start_time")
      .returns<Rule[]>(),
    supabase
      .from("blockouts")
      .select("id, start_date, end_date, reason")
      .gte("end_date", new Date().toISOString().slice(0, 10))
      .order("start_date"),
  ]);

  const t = await getTranslations("AdminAvailability");

  return (
    <main className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl">{t("title")}</h1>
        <AvailabilityEditor rules={rules ?? []} />
      </section>

      <section className="space-y-4 border-t pt-8">
        <h2 className="text-xl">{t("blockouts")}</h2>
        <p className="text-sm text-muted-foreground">{t("blockoutsHint")}</p>
        <BlockoutCalendar />
        {(blockouts ?? []).length > 0 && (
          <ul className="divide-y rounded-xl border border-border bg-card">
            {(blockouts ?? []).map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <span className="text-sm">
                  <span className="font-medium">
                    {b.start_date} → {b.end_date}
                  </span>
                  {b.reason && (
                    <span className="ml-2 text-muted-foreground">
                      {b.reason}
                    </span>
                  )}
                </span>
                <form action={deleteBlockout}>
                  <input type="hidden" name="id" value={b.id} />
                  <Button variant="ghost" size="sm" type="submit">
                    {t("remove")}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
