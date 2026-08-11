# 13 — Admin: Conteúdo tab (editable Home & Sobre)

Home and Sobre were hardcoded in the last pass. Everything they display in words or photos is now editable by Maria. Layout is not editable — no column or order controls.

Replaces the old "Página Sobre" tab: `AdminAbout` is deleted from `settings-form` and the new `AdminContent` covers both pages. Tab order: Pedidos · Aulas · Serviços · Disponibilidade · **Conteúdo** · Definições.

Reference: `ui_kits/admin/Content.jsx`.

## Shell

`Conteúdo` page: h1, a one-line intro ("O texto e as fotografias das páginas públicas. Preencha em ambos os idiomas — se o inglês ficar vazio, mostra-se o português."), then two pills — **Página inicial** / **Sobre** — styled like the main tab pills at 36px min-height. One Guardar button plus a "Ver página →" ghost link at the bottom, with the green "Alterações guardadas." line above them.

**Fallback rule, enforced server-side:** an empty EN string renders the PT value. This lets Maria write once and translate later instead of shipping empty sections.

## Shared patterns in this tab

- **SectionCard** — a Card per page section: title, optional hint, and a Visível/Oculto pill on the right (`--color-primary-tint` when visible, `--color-surface` + muted when hidden). Hidden sections collapse to just the header row. Sections that must always render (hero, closing CTA) get no toggle.
- **Bilingual field** — a `repeat(auto-fit, minmax(240px, 1fr))` grid with the PT field left and EN right, sharing one label ("Título (PT)" / "Título (EN)"). Input or Textarea depending on length.
- **PhotoField** — 64px-wide thumb at the slot's aspect ratio showing the "foto" placeholder, a Carregar button, and the current state ("Nenhuma imagem — mostra-se um espaço reservado."). Each states its required ratio and minimum size in the hint.
- **Derived note** — `--color-primary-tint` panel, 13px, `--color-primary-deep`. Used where a value comes from elsewhere and must not be duplicated here.
- **ItemBox** — bordered 12px-radius box per repeatable item with a 32×32 `×` remove button top-right, and an "Adicionar…" secondary button below the list.

## Página inicial editor

| Section | Editable | Toggle |
|---|---|---|
| Destaque | title, lede, reply line (empty hides it), hero photo | always on |
| Modalidades | section title only | yes |
| Com quem trabalho | section title + repeatable audiences (title, description) | yes |
| Como funcionam as aulas | section title + repeatable steps (title, description) + section photo | yes |
| Preço em destaque | note only | yes |
| Testemunhos | repeatable quotes (PT/EN quote, name, context, optional photo) | yes |
| Fecho | title, button label | always on |

Two derived values, deliberately not editable here:

- **Modalidades** copy is generated from the active services and the travel fee in Definições. A fee typed into a content field would not reach the booking calculation, so the note points to Definições instead.
- **The price figure** is the lowest hourly rate among active services and updates itself. The note points to Serviços.

Steps are numbered automatically; the numbers are not editable. Facts and steps have no explicit reorder control in this pass — if Maria needs it, drag handles on `ItemBox` are the natural place.

The testimonials section carries a `--color-warning-tint` warning: the current quote is a placeholder, and it should be replaced with a real one or the section hidden. If more than one testimonial is visible, Home shows one at random per page load.

## Sobre editor

| Section | Editable |
|---|---|
| Apresentação | portrait, name, tagline, two paragraphs |
| Números | up to 4 facts — value ("10+") + bilingual caption ("anos a ensinar"); the design is built for 3 |
| Como são as aulas | section title, three 1/1 photos, the closing sentence |
| Fecho | title |

The Números hint reminds Maria to confirm each claim before publishing — the current values (ten years, one-to-one/small groups, PT/EN/ES) were inferred, not given.

## Data model

One `page_content` record per page/locale pair, or a single JSON blob per page keyed by locale — either is fine, but section visibility must be a real boolean column per section, not an empty-string check, so a section can be hidden with its copy intact.

Photos: one `media` row per slot (`home_hero`, `home_how`, `about_portrait`, `about_strip_1..3`, `testimonial_<id>`) with the file, alt text, and the slot key. Where no row exists, the front end renders the `Photo` placeholder frame from handoff 11 — never a broken image.
