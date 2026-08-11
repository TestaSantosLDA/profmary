import { getTranslations, setRequestLocale } from "next-intl/server";
import { StudentsPills } from "@/components/admin/students-pills";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

type StudentRow = {
  id: string;
  name: string;
  profiles: { name: string };
};

type AttendanceRow = {
  student_id: string;
  bookings: {
    status: string;
    mode: "online" | "onsite";
    services: { title_pt: string };
  } | null;
};

function mostFrequent<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export default async function AdminStudentsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/students">) {
  const { locale } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const [{ data: students }, { data: answerRows }, { data: attendance }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, name, profiles(name)")
        .order("name")
        .returns<StudentRow[]>(),
      supabase.from("answers").select("student_id"),
      supabase
        .from("booking_attendees")
        .select("student_id, bookings(status, mode, services(title_pt))")
        .returns<AttendanceRow[]>(),
    ]);

  const answered = new Set((answerRows ?? []).map((a) => a.student_id));

  const lessonsByStudent = new Map<
    string,
    { count: number; services: string[]; modes: ("online" | "onsite")[] }
  >();
  for (const row of attendance ?? []) {
    if (!row.bookings || row.bookings.status !== "confirmed") continue;
    const entry = lessonsByStudent.get(row.student_id) ?? {
      count: 0,
      services: [],
      modes: [],
    };
    entry.count += 1;
    entry.services.push(row.bookings.services.title_pt);
    entry.modes.push(row.bookings.mode);
    lessonsByStudent.set(row.student_id, entry);
  }

  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const filtered = (students ?? []).filter(
    (s) => !query || s.name.toLowerCase().includes(query)
  );

  const t = await getTranslations("AdminStudents");

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <StudentsPills
          active="list"
          labels={{ list: t("pills.list"), builder: t("pills.builder") }}
        />
      </div>

      <form method="get">
        <Input
          type="search"
          name="q"
          defaultValue={typeof q === "string" ? q : ""}
          placeholder={t("searchPlaceholder")}
          className="max-w-[320px]"
        />
      </form>

      <ul className="divide-y rounded-xl border border-border bg-card">
        {filtered.map((s) => {
          const lessons = lessonsByStudent.get(s.id);
          const isWard =
            s.name.trim().toLowerCase() !== s.profiles.name.trim().toLowerCase();
          const summary = [
            mostFrequent(lessons?.services ?? []),
            lessons ? t(`modes.${mostFrequent(lessons.modes) ?? "online"}`) : null,
            t("lessonsCount", { count: lessons?.count ?? 0 }),
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <li key={s.id}>
              <Link
                href={`/admin/students/${s.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 no-underline transition-colors hover:bg-muted/50 hover:no-underline"
              >
                <span>
                  <span className="block font-medium text-foreground">
                    {s.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {summary}
                  </span>
                </span>
                <span className="flex gap-1.5">
                  {isWard && (
                    <span className="rounded-full bg-accent-tint px-3 py-1 text-[13px] font-medium whitespace-nowrap text-accent">
                      {t("wardTag")}
                    </span>
                  )}
                  {!answered.has(s.id) && (
                    <span className="rounded-full bg-warning-tint px-3 py-1 text-[13px] font-medium whitespace-nowrap text-warning">
                      {t("noQuestionnaire")}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("empty")}
          </li>
        )}
      </ul>
    </main>
  );
}
