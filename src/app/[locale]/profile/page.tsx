import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage({
  params,
}: PageProps<"/[locale]/profile">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, phone, locale, default_address, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect({ href: "/login", locale });
    return null;
  }

  const t = await getTranslations("Profile");
  const tCommon = await getTranslations("Common");

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>
      <ProfileForm profile={profile} isAdmin={profile.is_admin} />
      <form action={signOut} className="mt-8">
        <Button type="submit" variant="ghost">
          {tCommon("signOut")}
        </Button>
      </form>
    </main>
  );
}
