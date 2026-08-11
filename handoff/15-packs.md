# 15 — Packs de aulas

Prepaid hour packs. Reference: `ui_kits/website/Packs.jsx`, `Pricing.jsx`, `Book.jsx`, `Profile.jsx`, `ui_kits/admin/Services.jsx`, `Requests.jsx`, `Students.jsx`, `Bookings.jsx`.

## The rules this design is built on

- **A credit is one lesson, whatever its length.** A 90-minute lesson spends exactly one credit, same as a 60-minute one. This is a deliberate choice for simplicity over precision: it is trivial to explain and needs no arithmetic on either side. The trade-off is real and Maria should know it — a student who always books 90 minutes gets 50% more teaching per credit than one who books 60. If that starts to hurt, the fix is per-duration packs ("10 aulas de 60 min"), not a mid-flight rule change.
- **The discount is a lower price per lesson.** A pack has its own €/lesson; the saving is quoted against a standard 60-minute lesson, so the admin form labels it "face a aulas de 60 min avulsas".
- **Packs are defined per service.** Hours bought for one service cannot pay for another. A service may have no packs at all.
- **Validity is per pack**, set by Maria in months, and counts **from the moment she confirms payment** — not from the request.
- **The travel fee is included in the pack price.** A pack lesson at the student's home adds nothing.
- **Cancellation is Maria's call, every time.** No automatic rule.
- **Lessons belong to the account, not the student.** A guardian's two children draw on the same balance.
- **Payment is offline.** A pack request is a request; the balance exists only after Maria confirms she was paid.

That last point governs the whole flow: nothing on the site takes money, and no copy should imply it does.

## Website

### Preços

Each service card gains a "Packs de aulas" block below the CTA: a 12px uppercase muted eyebrow, then one row per pack separated by a 1px `--color-line` rule. Each row shows `10 aulas · 22,50€/aula`, then a second 13px line with the saving in `--color-accent` bold, "Deslocação incluída", and "Válido 6 meses". A secondary "Pedir pack" button sits right. Services with no packs show nothing — no empty state.

Below the grid, two explanatory lines: that one pack lesson is one lesson whatever its length, and how payment is arranged.

### Pedir pack — `/packs`

Max-width 640. Service select, then the pack options as selectable cards using the same treatment as the booking mode picker (`2px solid --color-accent` + `--color-accent-tint` when selected, 44px min height, 12px radius): "10 aulas" in the display font left, total price right, then the price per lesson + saving, then travel/validity.

A service may offer several packs of different sizes (5 and 10 lessons). Each purchase is its own balance; spend the one expiring soonest first.

A service with no packs shows a `--color-neutral-tint` note saying single lessons are still available — it does not disable the page.

Then a summary card breaking out aulas / preço por aula / poupança / total, and a "Como funciona o pagamento" card explaining that Maria arranges payment and the hours appear once she confirms, plus the account-wide sharing note. Primary "Enviar pedido" is disabled until a pack is picked.

### Marcar aula

When the account has pack lessons for the selected service, the estimate card gains a "Usar uma aula do pack" checkbox above the breakdown, with a line reading `Tem 6 aulas no seu pack · Ficam 5 aulas depois desta.`

With the pack applied, the breakdown collapses to "Aulas do pack: 1 aula", a line stating travel is covered when the lesson is at home, and **"Nada a pagar nesta aula — 0,00€"**. Unchecking restores the normal money breakdown, so the student can always choose to pay cash and keep the credit.

Duration does not affect the credit: booking 60 or 90 minutes spends one lesson either way, and the breakdown says nothing about length. The Duração select still drives the *money* estimate when the pack is not used, so it must be wired to state.

Empty balance: keep the money breakdown and show `Já não tem aulas no pack para este serviço. Pode pagar esta aula ou pedir outro pack.` Do not block the booking.

Recurring bookings need care: a weekly series can exhaust the balance mid-run. Spend a credit per lesson as each occurs rather than reserving the whole series up front, and warn at request time when the balance won't cover the full series.

### Perfil

A "Pack de aulas" card above the questionnaire card: the balance ("6 aulas") in the display font at 30px, then service + expiry date, then the account-sharing note, then "Pedir mais horas" (secondary) and "Histórico do pack" (ghost).

## Admin

### Serviços form

A "Packs de aulas" field under participants. Each pack is a bordered 12px box with aulas / preço-aula / validade(meses) in an auto-fit grid, a computed line reading `Total 225,00€ · poupa 25,00€ face a aulas de 60 min avulsas`, and a 32×32 `×` remove button. "Adicionar pack" below. Empty validity means no expiry.

The services list row appends the pack count to the modes line: `Online + domicílio · 2 packs`.

### Pedidos

Pack requests appear in the same queue as lesson requests, **above** them, as a distinct card: student · service, an accent "Pack" pill, the pack ("10 aulas · 22,50€/aula") and request date, the total in 15px semibold, a line stating the lessons only become available after payment is confirmed and that validity starts today, a **"Recebi o pagamento"** checkbox, then "Ativar pack" / "Recusar".

The checkbox is not decorative — activation without it should be blocked, because activating is the act that starts the clock on validity.

### Aulas

A "Cancelar uma aula paga com pack" panel with three selectable options: devolver a aula, consumir a aula, devolver e marcar como aviso. The choice is recorded in the pack's ledger. Copy states plainly that there's no automatic rule.

### Ficha do aluno

A "Pack de aulas" card between Aulas and Notas privadas. Active: balance at 28px display font, `de 10 aulas · serviço · válido até <data>`, the account-not-student note, and "Ajustar aulas" / "Ver movimentos". None: an explanation plus "Atribuir pack", so Maria can grant a pack agreed offline.

## Data model

- `pack` — `service_id`, `lessons`, `price_per_lesson`, `validity_months` (nullable = never expires), `active`. A template, not a purchase. No duration field: a credit is a lesson of any length.
- `pack_purchase` — `account_id`, `pack_id`, `lessons_total`, `lessons_remaining`, `status` (`requested` | `active` | `declined` | `expired`), `confirmed_at`, `expires_at` (computed from `confirmed_at` + `validity_months`), `price_paid`. Snapshot `price_per_lesson` here too, so editing the template later doesn't retroactively change what someone bought.
- `pack_ledger` — one row per movement: `pack_purchase_id`, `booking_id` (nullable), `delta_lessons` (negative on spend, positive on refund), `reason` (`lesson` | `cancel_refund` | `manual_adjust` | `expiry`), `created_at`, `note`. Never mutate `lessons_remaining` without a ledger row; Maria will be asked "where did my lessons go" and the answer has to exist.
- `booking` — `paid_with_pack_purchase_id` (nullable). When set, both `onsiteFeeApplied` (handoff 10) and the money total must be **0** regardless of duration.

Balance is `sum(delta_lessons)` over the ledger; `lessons_remaining` is a cache, and the ledger is the truth.

Expiry runs as a job that writes a negative ledger row with reason `expiry`, so an expired balance is visible and explainable rather than vanishing.

## Not designed in this pass

Pack history for the student (the "Histórico do pack" button has no screen yet), the movements list behind "Ver movimentos", and the "Ajustar aulas" dialog. All three are lists over `pack_ledger` and should share one presentation — worth doing together once the ledger exists.
