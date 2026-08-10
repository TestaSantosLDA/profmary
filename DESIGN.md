# ProfMary — Design Brief

The single source of truth for the design pass. Every screen, component, and
email follows this; deviations get discussed here first.

## Brand

- **Who**: Maria Martins, private Portuguese teacher. Lessons at students'
  homes. Two audiences: international adults living in Portugal, and
  Portuguese teens (+ their parents) preparing national exams.
- **Feel**: warm and personal, but sleek and confident. A real professional a
  parent trusts — with the light touch the name "ProfMary" promises. Never
  corporate, never template-y.
- **Anchor idea**: *Portuguese warmth, modern surface.* Subtle nods to
  Portugal (azulejo blue, tile geometry) on a clean contemporary layout.

## Palette (light-first; dark mode deferred)

| Token | Value | Use |
|---|---|---|
| `background` | `#FAF7F2` warm ivory | page background |
| `surface` | `#FFFFFF` | cards, forms |
| `ink` | `#22252B` near-black | text |
| `muted` | `#6E7076` | secondary text |
| `primary` | `#2456A6` azulejo blue | CTAs, links, active states |
| `primary-deep` | `#173A75` | hover, headers |
| `accent` | `#C96F4A` terracotta | highlights, selected time chips, badges |
| `positive` | `#2E7D5B` | confirmed states |
| `warning` | `#B7791F` | pending states |
| `line` | `#E8E2D9` | borders, dividers |

## Typography

- **Display / headings**: Fraunces (Google Fonts) — warm serif with
  personality; weights 500–600, tight tracking.
- **Body / UI**: Inter — clean, neutral; 400/500/600.
- Scale: generous. Hero ~clamp(2.2rem, 5vw, 3.5rem); section titles ~1.5rem;
  body 1rem/1.6.

## Signature elements

1. **Calendar-first booking**: a month-grid calendar (not a dropdown).
   Available days carry a small dot; selected day fills azulejo blue; time
   slots render as rounded chips below (terracotta when selected). Pattern
   reference: Cal.com's picker, warmed up.
2. **Tile motif**: a sparing azulejo-inspired geometric pattern as a thin
   decorative band (hero, email header). Decoration, never wallpaper.
3. **Soft cards**: `rounded-xl`, `1px` `line` border, shadow only on hover
   or elevation-worthy moments. No heavy shadows anywhere.
4. **Pill badges** for statuses using the semantic colors above.

## Layout rules

- Mobile-first everywhere; the admin queue is designed at 390px first.
- Max content width 1040px; generous vertical rhythm (sections ≥ 64px apart
  on public pages).
- One primary CTA per view, always azulejo blue.
- Forms: labels above inputs, 44px+ touch targets, inline validation text.

## Voice

- PT and EN copy both warm and direct; PT is the reference voice.
- Buttons are verbs ("Marcar aula", not "Submeter").

## Screens in scope

Public (Home, About, Pricing, Contact, Privacy) · auth pages · booking flow
(calendar rebuild) · student dashboard + series view · admin (queue,
bookings, services, availability, settings) · transactional emails.

## Review loop

Design system components sync to the Claude Design project for Maria's
review; the live preview deploy is the source of truth for full screens.
