import { getTranslations, setRequestLocale } from "next-intl/server";
import { QuestionBuilder } from "@/components/admin/question-builder";
import { StudentsPills } from "@/components/admin/students-pills";
import type { QuestionRow } from "@/lib/questionnaire/types";
import { createClient } from "@/lib/supabase/server";

export default async function AdminQuestionnairePage({
  params,
}: PageProps<"/[locale]/admin/students/questionnaire">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const [{ data: questionRows }, { data: services }] = await Promise.all([
    supabase
      .from("questions")
      .select(
        "id, service_id, type, label_pt, label_en, hint_pt, hint_en, options, follow_up_question_id, position, active"
      )
      .order("position")
      .returns<QuestionRow[]>(),
    supabase
      .from("services")
      .select("id, title_pt")
      .eq("active", true)
      .order("sort_order"),
  ]);

  const t = await getTranslations("AdminStudents");

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("builderTitle")}</h1>
        <StudentsPills
          active="builder"
          labels={{ list: t("pills.list"), builder: t("pills.builder") }}
        />
      </div>
      <QuestionBuilder
        questions={questionRows ?? []}
        services={services ?? []}
      />
    </main>
  );
}
