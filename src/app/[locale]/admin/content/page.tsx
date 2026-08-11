import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentEditor } from "@/components/admin/content-editor";
import {
  normalizeAbout,
  normalizeHome,
  type HomeVisibility,
  type MediaMap,
} from "@/lib/content/page-content";
import { createClient } from "@/lib/supabase/server";

type PageRow = {
  page: string;
  content: unknown;
} & HomeVisibility;

export default async function AdminContentPage({
  params,
}: PageProps<"/[locale]/admin/content">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const [{ data: pages }, { data: mediaRows }] = await Promise.all([
    supabase
      .from("page_content")
      .select(
        "page, content, show_formats, show_audiences, show_steps, show_price, show_testimonials"
      )
      .in("page", ["home", "about"])
      .returns<PageRow[]>(),
    supabase.from("media").select("slot, url"),
  ]);

  const homeRow = pages?.find((p) => p.page === "home");
  const aboutRow = pages?.find((p) => p.page === "about");
  const media: MediaMap = Object.fromEntries(
    (mediaRows ?? []).map((r) => [r.slot, r.url])
  );

  const t = await getTranslations("AdminContent");

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl">{t("title")}</h1>
        <p className="mt-1 max-w-[64ch] text-sm text-muted-foreground">
          {t("intro")}
        </p>
      </div>
      <ContentEditor
        home={normalizeHome(homeRow?.content)}
        about={normalizeAbout(aboutRow?.content)}
        visibility={{
          show_formats: homeRow?.show_formats ?? true,
          show_audiences: homeRow?.show_audiences ?? true,
          show_steps: homeRow?.show_steps ?? true,
          show_price: homeRow?.show_price ?? true,
          show_testimonials: homeRow?.show_testimonials ?? true,
        }}
        media={media}
      />
    </main>
  );
}
