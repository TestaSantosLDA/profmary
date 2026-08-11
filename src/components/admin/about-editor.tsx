"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSiteContent } from "@/lib/admin/site-content-actions";
import type { AdminActionState } from "@/lib/admin/services-actions";
import { createClient } from "@/lib/supabase/client";

const initialState: AdminActionState = { error: null, success: false };

export type ContentItem = {
  title_pt: string;
  title_en: string;
  body_pt: string;
  body_en: string;
};

export type SiteContent = {
  photo_url: string | null;
  display_name: string;
  tagline_pt: string;
  tagline_en: string;
  intro_pt: string;
  intro_en: string;
  highlights: ContentItem[];
  steps: ContentItem[];
};

const EMPTY_ITEM: ContentItem = {
  title_pt: "",
  title_en: "",
  body_pt: "",
  body_en: "",
};

function ItemListEditor({
  items,
  onChange,
}: {
  items: ContentItem[];
  onChange: (items: ContentItem[]) => void;
}) {
  const t = useTranslations("AdminAbout.items");

  const update = (index: number, patch: Partial<ContentItem>) =>
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const FIELDS = [
    ["title_pt", "title_en"],
    ["body_pt", "body_en"],
  ] as const;

  return (
    <div className="space-y-4">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}
      {items.map((item, i) => (
        <div
          key={i}
          className="space-y-3 rounded-[10px] border border-border bg-background p-4"
        >
          {FIELDS.map(([pt, en]) => (
            <div key={pt} className="grid gap-3 sm:grid-cols-2">
              {[pt, en].map((field) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={`${field}-${i}`}>{t(field)}</Label>
                  {field.startsWith("title") ? (
                    <Input
                      id={`${field}-${i}`}
                      value={item[field]}
                      onChange={(e) => update(i, { [field]: e.target.value })}
                    />
                  ) : (
                    <Textarea
                      id={`${field}-${i}`}
                      rows={2}
                      value={item[field]}
                      onChange={(e) => update(i, { [field]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            {t("remove")}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, EMPTY_ITEM])}
      >
        {t("add")}
      </Button>
    </div>
  );
}

export function AboutEditor({ content }: { content: SiteContent }) {
  const t = useTranslations("AdminAbout");
  const [state, formAction, pending] = useActionState(
    updateSiteContent,
    initialState
  );
  const [photoUrl, setPhotoUrl] = useState(content.photo_url ?? "");
  const [highlights, setHighlights] = useState(content.highlights);
  const [steps, setSteps] = useState(content.steps);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    setUploadError(false);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `about/photo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("site").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("site").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    } catch {
      setUploadError(true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form action={formAction} className="max-w-[640px] space-y-6">
      <input type="hidden" name="photo_url" value={photoUrl} />
      <input type="hidden" name="highlights" value={JSON.stringify(highlights)} />
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />

      <section className="space-y-5 rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-[1.15rem] font-semibold">
          {t("sectionTeacher")}
        </h2>

        <div className="space-y-2">
          <Label>{t("photo")}</Label>
          <div className="flex items-center gap-4">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="size-16 rounded-full border border-border object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="size-16 rounded-full border border-border bg-[repeating-linear-gradient(45deg,#EAF0F8,#EAF0F8_6px,#F1EDE6_6px,#F1EDE6_12px)]"
              />
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadPhoto(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? t("uploading") : t("uploadPhoto")}
            </Button>
          </div>
          {uploadError && (
            <p className="text-sm text-destructive">{t("uploadFailed")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="display_name">{t("name")}</Label>
          <Input
            id="display_name"
            name="display_name"
            defaultValue={content.display_name}
            placeholder="Maria Martins"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tagline_pt">{t("taglinePt")}</Label>
            <Input id="tagline_pt" name="tagline_pt" defaultValue={content.tagline_pt} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline_en">{t("taglineEn")}</Label>
            <Input id="tagline_en" name="tagline_en" defaultValue={content.tagline_en} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="intro_pt">{t("introPt")}</Label>
          <Textarea id="intro_pt" name="intro_pt" rows={4} defaultValue={content.intro_pt} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="intro_en">{t("introEn")}</Label>
          <Textarea id="intro_en" name="intro_en" rows={4} defaultValue={content.intro_en} />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="font-heading text-[1.15rem] font-semibold">
            {t("sectionHighlights")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("sectionHighlightsHint")}
          </p>
        </div>
        <ItemListEditor items={highlights} onChange={setHighlights} />
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="font-heading text-[1.15rem] font-semibold">
            {t("sectionSteps")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("sectionStepsHint")}
          </p>
        </div>
        <ItemListEditor items={steps} onChange={setSteps} />
      </section>

      {state.error && (
        <p className="text-sm text-destructive">{t("saveFailed")}</p>
      )}
      {state.success && <p className="text-sm text-positive">{t("saved")}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || uploading}>
          {t("save")}
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/about" className="no-underline hover:no-underline">
            {t("viewPage")}
          </Link>
        </Button>
      </div>
    </form>
  );
}
