import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  GrantPackForm,
  type GrantablePack,
} from "@/components/admin/grant-pack-form";
import { ResendQuestionnaireButton } from "@/components/admin/resend-questionnaire-button";
import { StudentNotesForm } from "@/components/admin/student-notes-form";
import { Link } from "@/i18n/navigation";
import { euros } from "@/lib/booking/format";
import type { AnswerValue, QuestionRow } from "@/lib/questionnaire/types";
import { createClient } from "@/lib/supabase/server";

type StudentDetail = {
  id: string;
  name: string;
  account_id: string;
  email: string | null;
  phone: string | null;
  private_notes: string;
  questionnaire_token: string;
  profiles: { name: string; email: string; phone: string | null };
};

type PurchaseCardRow = {
  id: string;
  lessons_total: number;
  lessons_remaining: number;
  expires_at: string | null;
  services: { title_pt: string };
};

type AnswerRow = {
  question_id: string;
  value: AnswerValue;
  answered_at: string;
};

type LessonRow = {
  bookings: {
    status: string;
    starts_at: string;
    mode: "online" | "onsite";
    price_estimate_cents: number;
    attendee_names: string[];
    services: { title_pt: string };
  } | null;
};

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function FichaCard({
  title,
  tag,
  children,
}: {
  title: string;
  tag?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-heading text-[1.05rem] font-semibold">{title}</h2>
        {tag}
      </div>
      {children}
    </section>
  );
}

export default async function AdminStudentPage({
  params,
}: PageProps<"/[locale]/admin/students/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select(
      "id, name, account_id, email, phone, private_notes, questionnaire_token, profiles(name, email, phone)"
    )
    .eq("id", id)
    .maybeSingle<StudentDetail>();

  if (!student) notFound();

  // The pack belongs to the account, not the ficha: siblings share it.
  const nowIso = new Date().toISOString();
  const [{ data: purchases }, { data: packTemplates }] = await Promise.all([
    supabase
      .from("pack_purchases")
      .select("id, lessons_total, lessons_remaining, expires_at, services(title_pt)")
      .eq("account_id", student.account_id)
      .eq("status", "active")
      .order("expires_at", { ascending: true, nullsFirst: false })
      .returns<PurchaseCardRow[]>(),
    supabase
      .from("packs")
      .select("id, lessons, price_per_lesson_cents, services(title_pt, active)")
      .eq("active", true),
  ]);
  const livePurchases = (purchases ?? []).filter(
    (p) => p.expires_at === null || p.expires_at > nowIso
  );
  const grantablePacks: GrantablePack[] = (packTemplates ?? [])
    .filter((p) => (p.services as unknown as { active: boolean }).active)
    .map((p) => ({
      id: p.id,
      label: `${(p.services as unknown as { title_pt: string }).title_pt} — ${p.lessons} aulas · ${euros(p.price_per_lesson_cents)}/aula`,
    }));

  const [{ data: answerRows }, { data: questionRows }, { data: lessonRows }] =
    await Promise.all([
      supabase
        .from("answers")
        .select("question_id, value, answered_at")
        .eq("student_id", id)
        .returns<AnswerRow[]>(),
      supabase
        .from("questions")
        .select(
          "id, service_id, type, label_pt, label_en, hint_pt, hint_en, options, follow_up_question_id, position, active"
        )
        .returns<QuestionRow[]>(),
      supabase
        .from("booking_attendees")
        .select(
          "bookings(status, starts_at, mode, price_estimate_cents, attendee_names, services(title_pt))"
        )
        .eq("student_id", id)
        .returns<LessonRow[]>(),
    ]);

  const t = await getTranslations("AdminStudents");

  const isWard =
    student.name.trim().toLowerCase() !==
    student.profiles.name.trim().toLowerCase();

  // ---- questionário ----
  const questions = new Map((questionRows ?? []).map((q) => [q.id, q]));
  const answers = new Map((answerRows ?? []).map((a) => [a.question_id, a]));
  // Answers render in questionnaire order: top-level by position, each
  // follow-up right after its parent. Versioned questions can leave several
  // rows pointing at the same follow-up, so every question renders at most
  // once, and only under a parent the student actually answered.
  const orderedAnswers: { question: QuestionRow; answer: AnswerRow }[] = [];
  const pushed = new Set<string>();
  const push = (question: QuestionRow, answer: AnswerRow) => {
    if (pushed.has(question.id)) return;
    pushed.add(question.id);
    orderedAnswers.push({ question, answer });
  };
  const topLevel = (questionRows ?? [])
    .filter((q) => !(questionRows ?? []).some((p) => p.follow_up_question_id === q.id))
    .sort(
      (a, b) =>
        Number(a.service_id !== null) - Number(b.service_id !== null) ||
        a.position - b.position
    );
  for (const q of topLevel) {
    const answer = answers.get(q.id);
    if (!answer) continue;
    push(q, answer);
    const followUp = q.follow_up_question_id
      ? questions.get(q.follow_up_question_id)
      : undefined;
    const followUpAnswer = followUp ? answers.get(followUp.id) : undefined;
    if (followUp && followUpAnswer) push(followUp, followUpAnswer);
  }
  // Whatever is left points at retired question rows; keep it visible.
  for (const [questionId, answer] of answers) {
    const question = questions.get(questionId);
    if (question) push(question, answer);
  }
  const answeredAt = (answerRows ?? [])
    .map((a) => a.answered_at)
    .sort()
    .at(-1);

  const renderValue = (q: QuestionRow, value: AnswerValue): string => {
    if (Array.isArray(value)) return value.join(" · ");
    if (q.type === "yes_no") return value === "yes" ? t("yes") : t("no");
    return value;
  };

  // ---- aulas ----
  const lessons = (lessonRows ?? [])
    .map((r) => r.bookings)
    .filter((b): b is NonNullable<LessonRow["bookings"]> => b !== null);
  const confirmed = lessons.filter((b) => b.status === "confirmed");
  const services = [...new Set(confirmed.map((b) => b.services.title_pt))];
  const modeCounts = confirmed.reduce(
    (acc, b) => ({ ...acc, [b.mode]: (acc[b.mode] ?? 0) + 1 }),
    {} as Record<string, number>
  );
  const usualMode = (modeCounts.online ?? 0) > (modeCounts.onsite ?? 0) ? "online" : "onsite";
  const now = new Date().toISOString();
  // Per-ficha share: the booking price covers every attendee, so siblings on
  // the same lesson split it instead of double-counting.
  const totalPaid = confirmed
    .filter((b) => b.starts_at < now)
    .reduce(
      (sum, b) => sum + b.price_estimate_cents / Math.max(b.attendee_names.length, 1),
      0
    );

  const dateFmt = new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    dateStyle: "long",
    timeZone: "Europe/Lisbon",
  });

  return (
    <main className="space-y-5">
      <div>
        <Link
          href="/admin/students"
          className="text-sm text-muted-foreground no-underline hover:text-foreground"
        >
          ← {t("title")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold">{student.name}</h1>
          {isWard && (
            <span className="rounded-full bg-accent-tint px-3 py-1 text-[13px] font-medium text-accent">
              {t("wardOf", { name: student.profiles.name })}
            </span>
          )}
        </div>
        {confirmed.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {services.join(" · ")} · {t(`modes.${usualMode}`)}
          </p>
        )}
      </div>

      {/* Mobile puts Notas right after Contactos — it's the card Maria uses
          most mid-lesson; desktop restores the handoff's 1-4 card order. */}
      <div className="grid items-start gap-5 md:grid-cols-2">
        <div className="order-1">
          <FichaCard title={t("contacts")}>
            <div className="divide-y divide-border">
              <ContactRow
                label={t("emailLabel")}
                value={student.email || student.profiles.email || "—"}
              />
              <ContactRow
                label={t("phoneLabel")}
                value={student.phone || student.profiles.phone || "—"}
              />
              {isWard && (
                <ContactRow label={t("guardianLabel")} value={student.profiles.name} />
              )}
            </div>
          </FichaCard>
        </div>

        <div className="order-3 md:order-2">
          <FichaCard
            title={t("questionnaire")}
            tag={
              orderedAnswers.length > 0 ? (
                <span className="rounded-full bg-positive-tint px-3 py-1 text-[13px] font-medium text-positive">
                  {t("answered")}
                </span>
              ) : (
                <span className="rounded-full bg-warning-tint px-3 py-1 text-[13px] font-medium text-warning">
                  {t("unanswered")}
                </span>
              )
            }
          >
            {orderedAnswers.length > 0 ? (
              <div>
                <div className="divide-y divide-border">
                  {orderedAnswers.map(({ question, answer }) => (
                    <div key={question.id} className="py-3 first:pt-0">
                      <p className="text-[13px] text-muted-foreground">
                        {question.label_pt}
                      </p>
                      <p className="mt-0.5 text-[15px]">
                        {renderValue(question, answer.value)}
                      </p>
                    </div>
                  ))}
                </div>
                {answeredAt && (
                  <p className="mt-3 border-t border-border pt-3 text-[13px] text-muted-foreground">
                    {t("answeredAt", { date: dateFmt.format(new Date(answeredAt)) })}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("unansweredHint")}
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <ResendQuestionnaireButton studentId={student.id} />
                  <Link
                    href={`/questionario/${student.questionnaire_token}`}
                    className="text-sm font-medium text-primary no-underline hover:underline"
                  >
                    {t("fillIn")}
                  </Link>
                </div>
              </div>
            )}
          </FichaCard>
        </div>

        <div className="order-2 md:order-5">
          <FichaCard title={t("notes")}>
            <p className="mb-3 text-[13px] text-muted-foreground">
              {t("notesHint")}
            </p>
            <StudentNotesForm studentId={student.id} notes={student.private_notes} />
          </FichaCard>
        </div>

        <div className="order-4 md:order-3">
          <FichaCard title={t("lessons")}>
            <div className="divide-y divide-border">
              <ContactRow
                label={t("totalLessons")}
                value={String(confirmed.length)}
              />
              <ContactRow
                label={t("servicesLabel")}
                value={services.join(", ") || "—"}
              />
              <ContactRow
                label={t("usualMode")}
                value={confirmed.length > 0 ? t(`modes.${usualMode}`) : "—"}
              />
              <ContactRow
                label={t("totalPaid")}
                value={euros(Math.round(totalPaid))}
              />
            </div>
            <Link
              href="/admin/bookings"
              className="mt-4 inline-block text-sm font-medium text-primary no-underline hover:underline"
            >
              {t("viewHistory")}
            </Link>
          </FichaCard>
        </div>

        <div className="order-5 md:order-4">
          <FichaCard title={t("pack.title")}>
            {livePurchases.length > 0 ? (
              <div>
                <div className="divide-y divide-border">
                  {livePurchases.map((p) => (
                    <div key={p.id} className="py-2.5 first:pt-0">
                      <p className="font-heading text-[28px] font-semibold leading-tight">
                        {t("pack.balance", { lessons: p.lessons_remaining })}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {t("pack.ofTotal", { total: p.lessons_total })} ·{" "}
                        {p.services.title_pt}
                        {p.expires_at &&
                          ` · ${t("pack.validUntil", {
                            date: dateFmt.format(new Date(p.expires_at)),
                          })}`}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 border-t border-border pt-3 text-[13px] text-muted-foreground">
                  {t("pack.accountNote")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("pack.none")}</p>
                <GrantPackForm
                  accountId={student.account_id}
                  packs={grantablePacks}
                />
              </div>
            )}
          </FichaCard>
        </div>
      </div>
    </main>
  );
}
