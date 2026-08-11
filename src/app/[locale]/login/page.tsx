import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { use } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/login">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const query = use(searchParams);

  const t = useTranslations("Auth");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
      <h1 className="mb-8 text-center text-3xl font-bold">{t("signIn")}</h1>
      <AuthForm
        mode="login"
        notice={query.notice === "confirm_email" ? "confirm_email" : null}
        urlError={query.error === "auth_callback" ? "auth_callback" : null}
      />
    </main>
  );
}
