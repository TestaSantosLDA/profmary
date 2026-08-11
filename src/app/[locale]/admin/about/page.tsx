import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AboutEditor,
  type SiteContent,
} from "@/components/admin/about-editor";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAboutPage({
  params,
}: PageProps<"/[locale]/admin/about">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: content } = await supabase
    .from("site_content")
    .select("photo_url, tagline_pt, tagline_en, intro_pt, intro_en")
    .eq("key", "about")
    .single<SiteContent>();

  const t = await getTranslations("AdminAbout");

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      {content && <AboutEditor content={content} />}
    </main>
  );
}
