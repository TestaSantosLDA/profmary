import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { use } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = use(params);
  setRequestLocale(locale);

  const t = useTranslations("Auth");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
      <h1 className="mb-8 text-center text-3xl font-bold">{t("signIn")}</h1>
      <AuthForm mode="login" />
    </main>
  );
}
