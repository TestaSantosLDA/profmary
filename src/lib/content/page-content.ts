// Shapes of the page_content JSON blobs for the public Home and Sobre pages.
// Bilingual fields are flat (_pt/_en); an empty EN string renders the PT
// value, and an empty PT falls back to the i18n launch copy (except where a
// field's emptiness means "hidden", noted per field).

export type ContentItem = {
  title_pt: string;
  title_en: string;
  body_pt: string;
  body_en: string;
};

export type TestimonialItem = {
  id: string;
  quote_pt: string;
  quote_en: string;
  name: string;
  context_pt: string;
  context_en: string;
};

export type FactItem = {
  value: string;
  caption_pt: string;
  caption_en: string;
};

export type HomeContent = {
  hero: {
    title_pt: string;
    title_en: string;
    lede_pt: string;
    lede_en: string;
    /** Empty (both locales) hides the reply line — no i18n fallback. */
    reply_pt: string;
    reply_en: string;
  };
  formats: { title_pt: string; title_en: string };
  audiences: { title_pt: string; title_en: string; items: ContentItem[] };
  steps: { title_pt: string; title_en: string; items: ContentItem[] };
  price: { note_pt: string; note_en: string };
  testimonials: { items: TestimonialItem[] };
  close: { title_pt: string; title_en: string; button_pt: string; button_en: string };
};

export type AboutContent = {
  hero: {
    name: string;
    tagline_pt: string;
    tagline_en: string;
    p1_pt: string;
    p1_en: string;
    p2_pt: string;
    p2_en: string;
  };
  facts: { items: FactItem[] };
  lessons: {
    title_pt: string;
    title_en: string;
    closing_pt: string;
    closing_en: string;
  };
  /** Empty close title renders the CTA pair without a heading. */
  close: { title_pt: string; title_en: string };
};

// Home section-visibility booleans (real columns on page_content, so a
// section can be hidden with its copy intact). Hero and close always render.
export type HomeVisibility = {
  show_formats: boolean;
  show_audiences: boolean;
  show_steps: boolean;
  show_price: boolean;
  show_testimonials: boolean;
};

/** slot → public URL; missing slots render the Photo placeholder frame. */
export type MediaMap = Record<string, string>;

export const MAX_ITEMS = 20;
export const MAX_FACTS = 4;
export const MAX_FIELD = 2000;

export const EMPTY_HOME: HomeContent = {
  hero: { title_pt: "", title_en: "", lede_pt: "", lede_en: "", reply_pt: "", reply_en: "" },
  formats: { title_pt: "", title_en: "" },
  audiences: { title_pt: "", title_en: "", items: [] },
  steps: { title_pt: "", title_en: "", items: [] },
  price: { note_pt: "", note_en: "" },
  testimonials: { items: [] },
  close: { title_pt: "", title_en: "", button_pt: "", button_en: "" },
};

export const EMPTY_ABOUT: AboutContent = {
  hero: { name: "", tagline_pt: "", tagline_en: "", p1_pt: "", p1_en: "", p2_pt: "", p2_en: "" },
  facts: { items: [] },
  lessons: { title_pt: "", title_en: "", closing_pt: "", closing_en: "" },
  close: { title_pt: "", title_en: "" },
};

const str = (v: unknown) => String(typeof v === "string" ? v : "").trim().slice(0, MAX_FIELD);

function section<T extends Record<string, string>>(raw: unknown, empty: T): T {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out = { ...empty } as Record<string, string>;
  for (const key of Object.keys(empty)) out[key] = str(src[key]);
  return out as T;
}

function items<T extends Record<string, string>>(
  raw: unknown,
  empty: T,
  max: number
): T[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, max)
    .map((entry) => section(entry, empty))
    .filter((it) => Object.values(it).some(Boolean));
}

const EMPTY_CONTENT_ITEM: ContentItem = { title_pt: "", title_en: "", body_pt: "", body_en: "" };
const EMPTY_TESTIMONIAL: TestimonialItem = { id: "", quote_pt: "", quote_en: "", name: "", context_pt: "", context_en: "" };
const EMPTY_FACT: FactItem = { value: "", caption_pt: "", caption_en: "" };

// Normalizers accept whatever JSON the DB (or a form) holds and return the
// full shape — used both to render and to sanitize before saving.
export function normalizeHome(raw: unknown): HomeContent {
  const src = (raw ?? {}) as Record<string, unknown>;
  const audiences = (src.audiences ?? {}) as Record<string, unknown>;
  const steps = (src.steps ?? {}) as Record<string, unknown>;
  const testimonials = (src.testimonials ?? {}) as Record<string, unknown>;
  return {
    hero: section(src.hero, EMPTY_HOME.hero),
    formats: section(src.formats, EMPTY_HOME.formats),
    audiences: {
      ...section(audiences, { title_pt: "", title_en: "" }),
      items: items(audiences.items, EMPTY_CONTENT_ITEM, MAX_ITEMS),
    },
    steps: {
      ...section(steps, { title_pt: "", title_en: "" }),
      items: items(steps.items, EMPTY_CONTENT_ITEM, MAX_ITEMS),
    },
    price: section(src.price, EMPTY_HOME.price),
    testimonials: {
      items: items(testimonials.items, EMPTY_TESTIMONIAL, MAX_ITEMS).filter(
        (t) => /^[a-z0-9-]+$/i.test(t.id)
      ),
    },
    close: section(src.close, EMPTY_HOME.close),
  };
}

export function normalizeAbout(raw: unknown): AboutContent {
  const src = (raw ?? {}) as Record<string, unknown>;
  const facts = (src.facts ?? {}) as Record<string, unknown>;
  return {
    hero: section(src.hero, EMPTY_ABOUT.hero),
    facts: { items: items(facts.items, EMPTY_FACT, MAX_FACTS) },
    lessons: section(src.lessons, EMPTY_ABOUT.lessons),
    close: section(src.close, EMPTY_ABOUT.close),
  };
}
