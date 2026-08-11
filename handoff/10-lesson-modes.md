# 10 — Lesson formats: online / at-home, with configurable travel fee

New capability: each service declares which formats it supports; the student picks one when booking; at-home lessons add a travel fee Maria configures.

## Data model

**Service** gains:
- `allowsOnline: boolean` (default `true`)
- `allowsOnsite: boolean` (default `true`)
- `onsiteFeeOverride: decimal | null` — null means use the global setting

Validation: at least one of `allowsOnline` / `allowsOnsite` must be true.

**Setting** gains:
- `onsiteFee: decimal` (default `5.00`)
- `onsiteFeeMode: "per_lesson" | "per_hour"` (default `per_lesson`)
- existing `travelFeeKmThreshold` stays — the extra-distance surcharge Maria still applies manually

**Booking** gains:
- `mode: "online" | "onsite"` — required
- `address` is required only when `mode === "onsite"`, ignored otherwise
- `onsiteFeeApplied: decimal` — snapshotted at request time so later setting changes don't rewrite old bookings

Effective fee: `service.onsiteFeeOverride ?? setting.onsiteFee`, multiplied by `durationHours` when `onsiteFeeMode === "per_hour"`.

## Admin — Serviços form (`ui_kits/admin/Services.jsx`)

New **Modalidades** field below "Máximo de participantes": two stacked toggle rows, each a 12px-radius bordered box. Unchecked rows drop to `--color-neutral-tint` background; checked rows go white.

1. **Online** — hint: "Aula por videochamada. O link é enviado na confirmação."
2. **Ao domicílio** — hint: "A professora desloca-se à morada do aluno." When checked, reveals a nested number field **Taxa de deslocação (€)**, `placeholder="5.00"`, hint: "Deixar vazio usa a taxa predefinida em Definições (5,00€ por aula)." The hint must interpolate the live global value.

Field hint on the group: "O aluno escolhe entre as modalidades ativas ao marcar. Pelo menos uma tem de estar ativa."

The services **list** row gains a third line under the meta line: modes summary in `--color-accent`, 12px, weight 600 — "Online + domicílio" / "Só online" / "Só ao domicílio".

## Admin — Definições (`ui_kits/admin/Settings.jsx`)

New section after the scheduling fields, separated by a 1px `--color-line` rule:

- H2 "Aulas ao domicílio" (1.05rem) + intro: "Taxa predefinida somada à estimativa quando o aluno escolhe aula ao domicílio. Cada serviço pode ter uma taxa própria."
- Two-up grid: **Taxa de deslocação (€)** number + **Cobrança** select (Por aula / Por hora)
- **Taxa extra a partir de (km)** — hint: "Para moradas mais distantes, aplicada manualmente ao aprovar o pedido."

## Website — Book (`ui_kits/website/Book.jsx`)

New **Modalidade** field directly after Serviço, before Duração.

When the service supports both formats: two selectable option cards in a `gap: 10` grid. Each card is a `<button type="button">`, full width, left-aligned, `min-height: 44px`, `padding: 12px 14px`, `border-radius: 12px`.

- unselected: `1px solid --color-line`, white
- selected: `2px solid --color-accent`, `--color-accent-tint`, `0 1px 3px rgba(0,0,0,.06)`
- top row: bold 15px label left, 12px right-aligned tag ("Incluído" / "+5,00€") in `--color-accent` when selected, else `--color-muted`
- second line: 13px `--color-muted` description

When the service supports only one format: no picker — a single 13px `--color-neutral-tint` note at radius 12 stating the format, with the fee in `--color-ink` bold if at-home.

Changing the service re-resolves the mode: if the current mode isn't offered, fall back to the service's first available one.

**Conditional field** in the right column, where the address field used to be:
- `onsite` → the existing **Morada da aula** textarea (required)
- `online` → **Link da videochamada** field showing a dashed-border 13px note: "Enviamos o link por email quando a aula for confirmada."

**Estimate card** replaces the single-line estimate with a breakdown in the same `--color-neutral-tint` card:
```
Aula (60 min)              25,00€     ← 14px --color-muted
Taxa de deslocação          5,00€     ← only when mode = onsite
─────────────────────────────────     ← 1px --color-line, 6px padding above
Total estimado             30,00€     ← 15px bold --color-ink
```
Payment note stays below.

## Admin — Pedidos (`ui_kits/admin/Requests.jsx`)

- Request card header gains a mode pill next to the "Semanal" pill: at-home uses `--color-accent-tint` / `--color-accent`, online uses `--color-neutral-tint` / `--color-muted`.
- The address line shows the address for at-home and "Link enviado na confirmação" for online.
- The meta line spells out the fee when applied: "2 participantes · 27,00€ (inclui 5,00€ de deslocação)".
- The manual fee checkbox is now the distance surcharge and shows only for at-home requests: "Taxa extra de distância (+5,00€)". The base travel fee is already in the total automatically.

## Copy — EN strings

| key | PT | EN |
|---|---|---|
| mode | Modalidade | Format |
| online | Online | Online |
| onlineDesc | Videochamada. O link é enviado na confirmação. | Video call. The link is sent on confirmation. |
| onsite | Ao domicílio | At your home |
| onsiteDesc | A professora desloca-se à sua morada. | The teacher travels to your address. |
| included | Incluído | Included |
| onlyOnsite | Este serviço é dado apenas ao domicílio. | This service is taught at your home only. |
| base | Aula (60 min) | Lesson (60 min) |
| travel | Taxa de deslocação | Travel fee |
| total | Total estimado | Estimated total |
| link | Link da videochamada | Video call link |
| linkHint | Enviamos o link por email quando a aula for confirmada. | We email the link once the lesson is confirmed. |

Currency format follows locale: `25,00€` (pt) / `€25.00` (en).

## Knock-on changes

- **Pricing page** — each service card should state its formats and the at-home fee.
- **Emails** — confirmation email needs the format line: at-home shows the address, online shows the meeting link. Reminder email likewise. Approval email total must include the travel fee.
- **Dashboard / Profile lesson lists** — show the mode pill on each upcoming lesson.
- **Availability** — out of scope here. Current design assumes one availability set covering both formats; if Maria wants online-only evening slots, that's a follow-up.
