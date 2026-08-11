# 4 · Public website

Reference screens: `ui_kits/website/` (Home.jsx, Pricing.jsx, About.jsx, Contact.jsx, Book.jsx). Copy for existing strings comes verbatim from `messages/pt.json` / `en.json`; new pages need new message keys (draft copy is in the kit files, flagged for Maria's review).

## 4.1 Header — `src/components/layout/site-header.tsx`

- Wordmark: `ProfMary` in `font-heading font-semibold text-xl` (there is no logo mark — never invent one).
- Nav links: muted → ink on hover, active page `text-primary font-semibold`.
- Language switcher (`language-switcher.tsx`): active locale `font-semibold underline underline-offset-4 text-foreground`, other muted — drop the current `rounded px-2` box look.
- CTA: the Button `default` variant, `size="sm"` (38px is fine in the 56px header), label `Common.bookLesson`.
- Mobile (<720px): hide center nav (pages remain reachable via footer/home); header keeps wordmark + switcher + CTA.

## 4.2 Home — `src/app/[locale]/page.tsx`

- `<TileBand height={12} />` directly under the header (the one tile band on the site).
- Hero: h1 `text-[clamp(2.2rem,5vw,3.5rem)]`, subtitle muted 17px, centered, `py-16`.
- CTAs stack vertically on mobile (`max-w-[300px] w-full`): primary `lg` "Marcar a primeira aula" → `/book`; secondary (outline) "Ver preços" → `/pricing`.

## 4.3 Pricing — `src/app/[locale]/pricing/page.tsx`

Currently a placeholder. Render active services from the existing `services` table:

- Responsive grid: `grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))] max-w-[1040px]` — stacks at 390px, 3-up desktop.
- Card per service: title (Lora 600 19px), description (muted 14px, `flex-1` so CTAs align), rate `<span class="font-heading font-semibold text-[26px]">25,00€</span><span class="text-[13px] text-muted-foreground"> /h por pessoa</span>`, meta line "60–120 minutos · máx. 3 participantes", CTA → `/book` (primary on the first card only, outline on the rest).
- Travel-fee note under the grid (13px muted), built from `settings.travel_fee_cents` / `threshold_km`.

## 4.4 About — `src/app/[locale]/about/page.tsx` + NEW `site_content` table

Layout (see `ui_kits/website/About.jsx`): 640px column — h1; 128px circular photo + name + azulejo tagline; intro paragraph (16px, max 58ch); "Com quem trabalho" as 2 cards (international adults / exam students); "Como funcionam as aulas" as 3 numbered steps (32px circle, `bg-secondary text-primary`, Lora 600); closing centered CTA card → `/book`.

Content is admin-editable (see `05-admin.md`). Schema:

```sql
create table site_content (
  key text primary key,          -- 'about'
  photo_url text,
  tagline_pt text not null default '',
  tagline_en text not null default '',
  intro_pt text not null default '',
  intro_en text not null default '',
  updated_at timestamptz not null default now()
);
-- RLS: public read, admin write (same pattern as settings)
```

Audience cards + steps can stay in `messages/*.json` (they're structural copy, not bio) — only photo/tagline/intro are editable in v1. Photo: Supabase Storage bucket `public/site`; page falls back to the striped placeholder until one is uploaded.

## 4.5 Contact — `src/app/[locale]/contact/page.tsx`

520px column: h1 + intro; two cards (Email, Telefone/WhatsApp) as `mailto:`/`tel:` links — **real details needed from Maria**; message form (Nome, Email, Mensagem + hint) submitting via a server action that emails Maria (reuse `sendEmail`), success state = positive-tint card "Mensagem enviada!".

## 4.6 Footer — `src/components/layout/site-footer.tsx`

Already correct structurally; tokens restyle it. Keep muted 14px, privacy link right-aligned.
