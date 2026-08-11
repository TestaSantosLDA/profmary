import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { QuestionnaireForm } from "@/components/questionnaire/questionnaire-form";
import { loadQuestionnaireByToken } from "@/lib/questionnaire/queries";

// The token is the credential: this page is reachable without a session so
// the link in the confirmation email works for guardians and students alike,
// and it must keep working indefinitely — answers get revised over time.
export default async function QuestionnairePage({
  params,
}: PageProps<"/[locale]/questionario/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const data = await loadQuestionnaireByToken(token, locale);
  if (!data) notFound();

  const t = await getTranslations("Questionnaire");

  return (
    <main className="mx-auto w-full max-w-[640px] flex-1 px-4 py-12">
      <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-[13px] font-medium text-primary">
        {t("optional")}
      </span>
      <h1 className="mt-3 text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 max-w-[56ch] text-muted-foreground">
        {t("intro", { name: data.student.name })}
      </p>
      <QuestionnaireForm
        token={token}
        sections={data.sections}
        initialAnswers={data.answers}
      />
    </main>
  );
}
