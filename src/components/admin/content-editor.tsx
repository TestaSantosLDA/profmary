"use client";

import { useActionState, useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/media/photo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePageContent } from "@/lib/admin/page-content-actions";
import type { AdminActionState } from "@/lib/admin/services-actions";
import {
  MAX_FACTS,
  type AboutContent,
  type ContentItem,
  type FactItem,
  type HomeContent,
  type HomeVisibility,
  type MediaMap,
  type TestimonialItem,
} from "@/lib/content/page-content";
import { createClient } from "@/lib/supabase/client";

const initialState: AdminActionState = { error: null, success: false };

const EMPTY_ITEM: ContentItem = { title_pt: "", title_en: "", body_pt: "", body_en: "" };
const EMPTY_FACT: FactItem = { value: "", caption_pt: "", caption_en: "" };

// ---- building blocks (top-level so inputs keep focus across re-renders) ----

function SectionCard({
  title,
  hint,
  toggle,
  children,
}: {
  title: string;
  hint?: string;
  // Sections that must always render (hero, closing CTA) get no toggle.
  toggle?: { visible: boolean; labels: [string, string]; onChange: (v: boolean) => void };
  children: ReactNode;
}) {
  const visible = toggle?.visible ?? true;
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-[1.15rem] font-semibold">{title}</h2>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {toggle && (
          <button
            type="button"
            onClick={() => toggle.onChange(!visible)}
            className={`shrink-0 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
              visible
                ? "border-primary bg-secondary text-primary"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {visible ? toggle.labels[0] : toggle.labels[1]}
          </button>
        )}
      </div>
      {visible && <div className="mt-5 space-y-5">{children}</div>}
    </section>
  );
}

function BiField({
  label,
  pt,
  en,
  onChange,
  textarea = false,
  rows = 3,
  hint,
}: {
  label: string;
  pt: string;
  en: string;
  onChange: (patch: { pt?: string; en?: string }) => void;
  textarea?: boolean;
  rows?: number;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        {(["pt", "en"] as const).map((lang) => (
          <div key={lang} className="space-y-1.5">
            <Label htmlFor={`${id}-${lang}`}>
              {label} ({lang.toUpperCase()})
            </Label>
            {textarea ? (
              <Textarea
                id={`${id}-${lang}`}
                rows={rows}
                value={lang === "pt" ? pt : en}
                onChange={(e) => onChange({ [lang]: e.target.value })}
              />
            ) : (
              <Input
                id={`${id}-${lang}`}
                value={lang === "pt" ? pt : en}
                onChange={(e) => onChange({ [lang]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// Derived-value panel: the figure comes from elsewhere and must not be
// duplicated into a content field.
function DerivedNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[10px] bg-secondary px-3.5 py-2.5 text-[13px] text-primary-deep">
      {children}
    </p>
  );
}

function ItemBox({
  onRemove,
  removeLabel,
  children,
}: {
  onRemove: () => void;
  removeLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="relative rounded-xl border border-border p-4 pr-12">
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        ×
      </button>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function PhotoField({
  label,
  slot,
  ratio,
  round = false,
  hint,
  media,
  uploadingSlot,
  onUpload,
  t,
}: {
  label: string;
  slot: string;
  ratio: string;
  round?: boolean;
  hint: string;
  media: MediaMap;
  uploadingSlot: string | null;
  onUpload: (slot: string, file: File) => void;
  t: (key: string) => string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const url = media[slot];
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <Photo
          src={url}
          ratio={ratio}
          round={round}
          radius={8}
          showLabel={!round}
          className="w-16 shrink-0"
        />
        <div className="space-y-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(slot, file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadingSlot !== null}
            onClick={() => fileRef.current?.click()}
          >
            {uploadingSlot === slot ? t("uploading") : t("upload")}
          </Button>
          {!url && (
            <p className="text-xs text-muted-foreground">{t("noImage")}</p>
          )}
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
    </div>
  );
}

// ---- the tab ----

export function ContentEditor({
  home: initialHome,
  about: initialAbout,
  visibility: initialVis,
  media: initialMedia,
}: {
  home: HomeContent;
  about: AboutContent;
  visibility: HomeVisibility;
  media: MediaMap;
}) {
  const t = useTranslations("AdminContent");
  const [state, formAction, pending] = useActionState(
    updatePageContent,
    initialState
  );

  const [page, setPage] = useState<"home" | "about">("home");
  const [home, setHome] = useState(initialHome);
  const [about, setAbout] = useState(initialAbout);
  const [vis, setVis] = useState(initialVis);
  const [media, setMedia] = useState(initialMedia);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState(false);

  const patchHome = <K extends keyof HomeContent>(
    section: K,
    patch: Partial<HomeContent[K]>
  ) => setHome((h) => ({ ...h, [section]: { ...h[section], ...patch } }));
  const patchAbout = <K extends keyof AboutContent>(
    section: K,
    patch: Partial<AboutContent[K]>
  ) => setAbout((a) => ({ ...a, [section]: { ...a[section], ...patch } }));

  const toggle = (key: keyof HomeVisibility) => ({
    visible: vis[key],
    labels: [t("visible"), t("hidden")] as [string, string],
    onChange: (v: boolean) => setVis((s) => ({ ...s, [key]: v })),
  });

  const uploadPhoto = async (slot: string, file: File) => {
    setUploadingSlot(slot);
    setUploadError(false);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `content/${slot}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("site").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("site").getPublicUrl(path);
      setMedia((m) => ({ ...m, [slot]: data.publicUrl }));
    } catch {
      setUploadError(true);
    } finally {
      setUploadingSlot(null);
    }
  };

  const photoField = (label: string, slot: string, ratio: string, minPx: number, round = false) => (
    <PhotoField
      label={label}
      slot={slot}
      ratio={ratio}
      round={round}
      hint={t("photoHint", { ratio: ratio.replace("/", ":"), min: minPx })}
      media={media}
      uploadingSlot={uploadingSlot}
      onUpload={uploadPhoto}
      t={t}
    />
  );

  const itemList = (
    items: ContentItem[],
    onChange: (items: ContentItem[]) => void
  ) => (
    <div className="space-y-3">
      {items.map((item, i) => (
        <ItemBox
          key={i}
          removeLabel={t("remove")}
          onRemove={() => onChange(items.filter((_, j) => j !== i))}
        >
          <BiField
            label={t("itemTitle")}
            pt={item.title_pt}
            en={item.title_en}
            onChange={({ pt, en }) =>
              onChange(
                items.map((it, j) =>
                  j === i
                    ? { ...it, title_pt: pt ?? it.title_pt, title_en: en ?? it.title_en }
                    : it
                )
              )
            }
          />
          <BiField
            label={t("itemBody")}
            pt={item.body_pt}
            en={item.body_en}
            textarea
            rows={2}
            onChange={({ pt, en }) =>
              onChange(
                items.map((it, j) =>
                  j === i
                    ? { ...it, body_pt: pt ?? it.body_pt, body_en: en ?? it.body_en }
                    : it
                )
              )
            }
          />
        </ItemBox>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, EMPTY_ITEM])}>
        {t("add")}
      </Button>
    </div>
  );

  return (
    <form action={formAction} className="max-w-[720px] space-y-6">
      <input type="hidden" name="home" value={JSON.stringify(home)} />
      <input type="hidden" name="about" value={JSON.stringify(about)} />
      <input type="hidden" name="media" value={JSON.stringify(media)} />
      {(Object.keys(vis) as (keyof HomeVisibility)[]).map((k) => (
        <input key={k} type="hidden" name={k} value={String(vis[k])} />
      ))}

      <div className="flex gap-2">
        {(["home", "about"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPage(p)}
            className={`min-h-9 rounded-full border px-4 text-[13px] font-medium transition-colors ${
              page === p
                ? "border-primary bg-secondary text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(p === "home" ? "pageHome" : "pageAbout")}
          </button>
        ))}
      </div>

      {page === "home" ? (
        <div className="space-y-6">
          <SectionCard title={t("home.heroTitle")}>
            <BiField
              label={t("home.heroField")}
              pt={home.hero.title_pt}
              en={home.hero.title_en}
              onChange={({ pt, en }) =>
                patchHome("hero", {
                  ...(pt !== undefined && { title_pt: pt }),
                  ...(en !== undefined && { title_en: en }),
                })
              }
            />
            <BiField
              label={t("home.ledeField")}
              pt={home.hero.lede_pt}
              en={home.hero.lede_en}
              textarea
              onChange={({ pt, en }) =>
                patchHome("hero", {
                  ...(pt !== undefined && { lede_pt: pt }),
                  ...(en !== undefined && { lede_en: en }),
                })
              }
            />
            <BiField
              label={t("home.replyField")}
              pt={home.hero.reply_pt}
              en={home.hero.reply_en}
              hint={t("home.replyHint")}
              onChange={({ pt, en }) =>
                patchHome("hero", {
                  ...(pt !== undefined && { reply_pt: pt }),
                  ...(en !== undefined && { reply_en: en }),
                })
              }
            />
            {photoField(t("home.heroPhoto"), "home_hero", "4/5", 800)}
          </SectionCard>

          <SectionCard title={t("home.formatsTitle")} toggle={toggle("show_formats")}>
            <BiField
              label={t("sectionTitleField")}
              pt={home.formats.title_pt}
              en={home.formats.title_en}
              onChange={({ pt, en }) =>
                patchHome("formats", {
                  ...(pt !== undefined && { title_pt: pt }),
                  ...(en !== undefined && { title_en: en }),
                })
              }
            />
            <DerivedNote>{t("home.formatsNote")}</DerivedNote>
          </SectionCard>

          <SectionCard title={t("home.audiencesTitle")} toggle={toggle("show_audiences")}>
            <BiField
              label={t("sectionTitleField")}
              pt={home.audiences.title_pt}
              en={home.audiences.title_en}
              onChange={({ pt, en }) =>
                patchHome("audiences", {
                  ...(pt !== undefined && { title_pt: pt }),
                  ...(en !== undefined && { title_en: en }),
                })
              }
            />
            {itemList(home.audiences.items, (items) => patchHome("audiences", { items }))}
          </SectionCard>

          <SectionCard
            title={t("home.stepsTitle")}
            hint={t("home.stepsHint")}
            toggle={toggle("show_steps")}
          >
            <BiField
              label={t("sectionTitleField")}
              pt={home.steps.title_pt}
              en={home.steps.title_en}
              onChange={({ pt, en }) =>
                patchHome("steps", {
                  ...(pt !== undefined && { title_pt: pt }),
                  ...(en !== undefined && { title_en: en }),
                })
              }
            />
            {itemList(home.steps.items, (items) => patchHome("steps", { items }))}
            {photoField(t("home.stepsPhoto"), "home_how", "5/4", 900)}
          </SectionCard>

          <SectionCard title={t("home.priceTitle")} toggle={toggle("show_price")}>
            <BiField
              label={t("home.priceNoteField")}
              pt={home.price.note_pt}
              en={home.price.note_en}
              textarea
              rows={2}
              onChange={({ pt, en }) =>
                patchHome("price", {
                  ...(pt !== undefined && { note_pt: pt }),
                  ...(en !== undefined && { note_en: en }),
                })
              }
            />
            <DerivedNote>{t("home.priceNote")}</DerivedNote>
          </SectionCard>

          <SectionCard
            title={t("home.testimonialsTitle")}
            hint={t("home.testimonialsHint")}
            toggle={toggle("show_testimonials")}
          >
            <p className="rounded-[10px] bg-warning-tint px-3.5 py-2.5 text-[13px] text-warning">
              {t("home.testimonialsWarning")}
            </p>
            <div className="space-y-3">
              {home.testimonials.items.map((item, i) => (
                <ItemBox
                  key={item.id}
                  removeLabel={t("remove")}
                  onRemove={() =>
                    patchHome("testimonials", {
                      items: home.testimonials.items.filter((_, j) => j !== i),
                    })
                  }
                >
                  <BiField
                    label={t("home.quoteField")}
                    pt={item.quote_pt}
                    en={item.quote_en}
                    textarea
                    rows={2}
                    onChange={({ pt, en }) =>
                      patchHome("testimonials", {
                        items: home.testimonials.items.map((it, j) =>
                          j === i
                            ? {
                                ...it,
                                quote_pt: pt ?? it.quote_pt,
                                quote_en: en ?? it.quote_en,
                              }
                            : it
                        ),
                      })
                    }
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor={`t-name-${item.id}`}>{t("home.nameField")}</Label>
                    <Input
                      id={`t-name-${item.id}`}
                      value={item.name}
                      onChange={(e) =>
                        patchHome("testimonials", {
                          items: home.testimonials.items.map((it, j) =>
                            j === i ? { ...it, name: e.target.value } : it
                          ),
                        })
                      }
                    />
                  </div>
                  <BiField
                    label={t("home.contextField")}
                    pt={item.context_pt}
                    en={item.context_en}
                    onChange={({ pt, en }) =>
                      patchHome("testimonials", {
                        items: home.testimonials.items.map((it, j) =>
                          j === i
                            ? {
                                ...it,
                                context_pt: pt ?? it.context_pt,
                                context_en: en ?? it.context_en,
                              }
                            : it
                        ),
                      })
                    }
                  />
                  {photoField(
                    t("home.testimonialPhoto"),
                    `testimonial_${item.id}`,
                    "1/1",
                    200,
                    true
                  )}
                </ItemBox>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  patchHome("testimonials", {
                    items: [
                      ...home.testimonials.items,
                      {
                        id: crypto.randomUUID(),
                        quote_pt: "",
                        quote_en: "",
                        name: "",
                        context_pt: "",
                        context_en: "",
                      } satisfies TestimonialItem,
                    ],
                  })
                }
              >
                {t("add")}
              </Button>
            </div>
          </SectionCard>

          <SectionCard title={t("home.closeTitle")}>
            <BiField
              label={t("home.closeField")}
              pt={home.close.title_pt}
              en={home.close.title_en}
              onChange={({ pt, en }) =>
                patchHome("close", {
                  ...(pt !== undefined && { title_pt: pt }),
                  ...(en !== undefined && { title_en: en }),
                })
              }
            />
            <BiField
              label={t("home.closeButtonField")}
              pt={home.close.button_pt}
              en={home.close.button_en}
              onChange={({ pt, en }) =>
                patchHome("close", {
                  ...(pt !== undefined && { button_pt: pt }),
                  ...(en !== undefined && { button_en: en }),
                })
              }
            />
          </SectionCard>
        </div>
      ) : (
        <div className="space-y-6">
          <SectionCard title={t("about.heroTitle")}>
            {photoField(t("about.portrait"), "about_portrait", "4/5", 800)}
            <div className="space-y-1.5">
              <Label htmlFor="about-name">{t("about.name")}</Label>
              <Input
                id="about-name"
                value={about.hero.name}
                onChange={(e) => patchAbout("hero", { name: e.target.value })}
                placeholder="Maria Martins"
              />
            </div>
            <BiField
              label={t("about.tagline")}
              pt={about.hero.tagline_pt}
              en={about.hero.tagline_en}
              onChange={({ pt, en }) =>
                patchAbout("hero", {
                  ...(pt !== undefined && { tagline_pt: pt }),
                  ...(en !== undefined && { tagline_en: en }),
                })
              }
            />
            <BiField
              label={t("about.p1")}
              pt={about.hero.p1_pt}
              en={about.hero.p1_en}
              textarea
              onChange={({ pt, en }) =>
                patchAbout("hero", {
                  ...(pt !== undefined && { p1_pt: pt }),
                  ...(en !== undefined && { p1_en: en }),
                })
              }
            />
            <BiField
              label={t("about.p2")}
              pt={about.hero.p2_pt}
              en={about.hero.p2_en}
              textarea
              onChange={({ pt, en }) =>
                patchAbout("hero", {
                  ...(pt !== undefined && { p2_pt: pt }),
                  ...(en !== undefined && { p2_en: en }),
                })
              }
            />
          </SectionCard>

          <SectionCard title={t("about.factsTitle")} hint={t("about.factsHint")}>
            <div className="space-y-3">
              {about.facts.items.map((fact, i) => (
                <ItemBox
                  key={i}
                  removeLabel={t("remove")}
                  onRemove={() =>
                    patchAbout("facts", {
                      items: about.facts.items.filter((_, j) => j !== i),
                    })
                  }
                >
                  <div className="space-y-1.5">
                    <Label htmlFor={`fact-value-${i}`}>{t("about.factValue")}</Label>
                    <Input
                      id={`fact-value-${i}`}
                      value={fact.value}
                      placeholder="10+"
                      onChange={(e) =>
                        patchAbout("facts", {
                          items: about.facts.items.map((it, j) =>
                            j === i ? { ...it, value: e.target.value } : it
                          ),
                        })
                      }
                    />
                  </div>
                  <BiField
                    label={t("about.factCaption")}
                    pt={fact.caption_pt}
                    en={fact.caption_en}
                    onChange={({ pt, en }) =>
                      patchAbout("facts", {
                        items: about.facts.items.map((it, j) =>
                          j === i
                            ? {
                                ...it,
                                caption_pt: pt ?? it.caption_pt,
                                caption_en: en ?? it.caption_en,
                              }
                            : it
                        ),
                      })
                    }
                  />
                </ItemBox>
              ))}
              {about.facts.items.length < MAX_FACTS && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    patchAbout("facts", {
                      items: [...about.facts.items, EMPTY_FACT],
                    })
                  }
                >
                  {t("add")}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">{t("about.factsMax")}</p>
            </div>
          </SectionCard>

          <SectionCard title={t("about.lessonsTitle")}>
            <BiField
              label={t("sectionTitleField")}
              pt={about.lessons.title_pt}
              en={about.lessons.title_en}
              onChange={({ pt, en }) =>
                patchAbout("lessons", {
                  ...(pt !== undefined && { title_pt: pt }),
                  ...(en !== undefined && { title_en: en }),
                })
              }
            />
            {([1, 2, 3] as const).map((n) => (
              <div key={n}>
                {photoField(t("about.photoN", { n }), `about_strip_${n}`, "1/1", 600)}
              </div>
            ))}
            <BiField
              label={t("about.closingField")}
              pt={about.lessons.closing_pt}
              en={about.lessons.closing_en}
              textarea
              rows={2}
              onChange={({ pt, en }) =>
                patchAbout("lessons", {
                  ...(pt !== undefined && { closing_pt: pt }),
                  ...(en !== undefined && { closing_en: en }),
                })
              }
            />
          </SectionCard>

          <SectionCard title={t("about.closeTitle")} hint={t("about.closeHint")}>
            <BiField
              label={t("home.closeField")}
              pt={about.close.title_pt}
              en={about.close.title_en}
              onChange={({ pt, en }) =>
                patchAbout("close", {
                  ...(pt !== undefined && { title_pt: pt }),
                  ...(en !== undefined && { title_en: en }),
                })
              }
            />
          </SectionCard>
        </div>
      )}

      {uploadError && (
        <p className="text-sm text-destructive">{t("uploadFailed")}</p>
      )}
      {state.error && <p className="text-sm text-destructive">{t("saveFailed")}</p>}
      {state.success && <p className="text-sm text-positive">{t("saved")}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || uploadingSlot !== null}>
          {t("save")}
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link
            href={page === "home" ? "/" : "/about"}
            className="no-underline hover:no-underline"
          >
            {t("viewPage")}
          </Link>
        </Button>
      </div>
    </form>
  );
}
