# 5 · Admin

Reference screens: `ui_kits/admin/` (Requests, Bookings, Services, Availability, Settings + AdminAbout in Settings.jsx). Designed at 390px first; PT-only copy (existing `Admin.*` messages).

## 5.1 Shell — `src/app/[locale]/admin/layout.tsx`

Replace the text-link nav with pill tabs (wrapping row): active `border-primary bg-secondary text-primary`, inactive `border-border bg-card text-muted-foreground`, `rounded-full px-3.5 py-2 text-[13px] font-medium`. Add the new tab:

```diff
 const ADMIN_NAV = [
   { href: "/admin", key: "requests" },
   { href: "/admin/bookings", key: "bookings" },
   { href: "/admin/services", key: "services" },
   { href: "/admin/availability", key: "availability" },
+  { href: "/admin/about", key: "about" },        // messages: Admin.nav.about = "Página Sobre" / "About page"
   { href: "/admin/settings", key: "settings" },
 ];
```

Header shows `ProfMary · admin` (wordmark Lora 600 + muted suffix) with "Sair".

## 5.2 Pedidos — `src/components/admin/request-card.tsx`

Each request becomes a Card (12px radius) instead of a divided `<li>`:
- Title row: `{student} · {service}` semibold 15px; series pill `bg-secondary text-primary rounded-full px-2.5 py-0.5 text-xs` — **replaces the violet `bg-violet-100` span** (violet is off-palette).
- Meta lines muted 14px; note Input; travel-fee Checkbox; actions: Aprovar (primary sm) + Recusar (outline sm).

## 5.3 Aulas — `src/app/[locale]/admin/bookings/page.tsx`

- "Próximos 7 dias": day headings (Lora, 1.05rem) + Card with divided rows `**15:00** · name · service · muted address`. Note: the `capitalize` class on day headings has the same pt-PT bug as the calendar — drop it or uppercase first letter only.
- "Todas as marcações": status filter (Select h-9 + outline Filtrar button) right of the h2; rows in one Card with `StatusBadge` (from 02) replacing the current plain badge; keep email/phone muted line.

## 5.4 Serviços — services/page.tsx + service-form.tsx

- List: one Card, divided clickable rows; "Inativo" as a gray pill (`bg-muted text-muted-foreground rounded-full`); "Novo serviço" = the page's primary button.
- Form: wrap in a Card; 2-col grid for PT/EN titles, 3-col for rate/min/max (both `minmax`-collapse at 390px); labels above, hints below (13px muted); active Checkbox; Guardar primary.

## 5.5 Disponibilidade — REDESIGNED (availability/page.tsx + availability-forms.tsx)

Replace the rules list + add-rule form with a **weekly editor** (reference: `ui_kits/admin/Availability.jsx`):

- One row per weekday (Seg→Dom always visible) inside one Card: toggle switch (40×24 pill, azulejo when on) + day name; off rows get `bg-muted` and "Indisponível".
- Each rule renders as a **pill chip** with two inline `<input type="time">` and a ✕; "+ Adicionar" ghost button per day (supports split schedules).
- Persistence: same `availability_rules` rows — toggle-off deletes the day's rules; chip edits update start/end; existing overlap validation applies per save.

**Blockouts**: replace the De/Até date inputs with a **range calendar** (reuse the BookingCalendar grid rendering): first tap = start, second tap = end, same-day double-tap = single day; endpoints `bg-primary text-white`, in-between `bg-secondary`, past days disabled. Beside it: formatted selection ("24–31 de agosto de 2026"), Motivo input, "Adicionar período" (outline, disabled until a start is picked).

## 5.6 Página Sobre — NEW `src/app/[locale]/admin/about/page.tsx`

Edits the `site_content` row (schema in `04-website.md`). One Card, max 640px:
- Fotografia: 64px circular preview + "Carregar fotografia" (outline sm) → Supabase Storage upload.
- Subtítulo PT/EN (Inputs, 2-col), Apresentação PT/EN (Textareas, 4 rows).
- Guardar (primary) + "Ver página →" ghost link to `/about`; success message "Alterações guardadas." in positive green.
- Server action `updateSiteContent` mirrors `updateSettings` (admin-only, revalidates `/about`).

## 5.7 Definições — settings-form.tsx

Structure unchanged; wrap in a Card (max 480px), 2-col grid for the travel-fee pair. Replace `text-green-600` success with `text-positive`.
