# 14 — Questionário para novos alunos + Alunos tab

New feature in three parts: a student-facing intake form, a per-service question builder for Maria, and an Alunos tab holding a ficha per student. Reference: `ui_kits/website/Questionnaire.jsx`, `ui_kits/admin/Students.jsx`.

## Product rules agreed

- The link is sent **in the confirmation email of the first lesson** — not at signup, not at booking. Nothing blocks a booking on it.
- **Every question is optional.** No required fields anywhere, including the student's name.
- Question sets are configured **per service**, on top of a shared "perguntas comuns" set. A student sees the common questions, then the ones belonging to the service they booked.
- Maria **creates and edits questions herself**. Four answer types only: texto curto, texto longo, escolha múltipla, sim/não.
- **Guardians own the account.** A child student is a ficha inside the guardian's account, not an account of its own.

Consequence worth stating plainly: sent after confirmation and fully optional, completion will not be high. The design compensates with a short form, a permanent profile entry point, a resend button, and a "Preencher por ele" action so Maria can fill it in during the lesson. If completion is still poor after a month, the lever to pull is moving the ask into the booking flow — not adding required fields.

## Student form — `/questionario/[token]`

Single column, max-width 640. Opens from a tokenised link in the email; also reachable from the profile.

- An "Opcional" pill above the h1, so the framing is set before the first question.
- Intro: three minutes, all optional, save whenever.
- Questions are grouped under 12px uppercase muted eyebrows ("Sobre quem é a aula", "Sobre si").
- **One question per Card**, 14px apart: 16px semibold label, optional 13px muted hint, control below with 14px of space.
- Text answers use Input/Textarea. Sim/não and escolha múltipla both use full-width option buttons — 44px min height, 10px radius, `2px solid --color-accent` + `--color-accent-tint` when selected, matching the booking mode picker. Sim/não is a two-column grid and deselectable; escolha múltipla is a stacked grid.
- A "sim" answer may reveal one follow-up field (`Onde e durante quanto tempo?`). Conditional follow-ups are a property of the question, editable in the builder.
- Footer: primary "Guardar respostas", ghost "Continuar mais tarde", and a 13px note that answers persist and the link can be reused.

The token link must stay valid indefinitely and survive multiple edits — students revise these answers as their level changes.

## Admin — Alunos tab

New tab between Disponibilidade and Conteúdo. Two pills: **Alunos** (list) and **Questionário** (builder).

### List

Search input (max 320px), then a `padding={0}` Card with one row per student: name, then `serviço · modalidade · N aulas` muted. Right-aligned tags: `Educando` in accent when the ficha belongs to a guardian's account, `Sem questionário` in warning when unanswered. Rows open the ficha.

### Ficha

Header: name, an `Educando de <guardião>` accent tag when applicable, service/format line. Then four cards:

1. **Contactos** — email, telefone, and the guardian row when present. Label-left/value-right rows separated by 1px `--color-line`.
2. **Questionário** — `Respondido` (positive) or `Por responder` (warning) tag in the header. Answered: question in 13px muted, answer in 15px below, separated by rules, with the answer date at the bottom. Unanswered: an explanation plus "Reenviar link" and "Preencher por ele".
3. **Aulas** — total lessons, services, usual format, total paid, and a link to the full history.
4. **Notas privadas** — a textarea, with an explicit line stating the student never sees these. This is the field Maria will use most; keep it above the fold on mobile if anything gets cut.

### Builder

A "Conjunto" select switching between "Perguntas comuns" and each service. The list shows the question, its type, and the option count for escolha múltipla, each with an Editar action. Empty per-service sets say so rather than showing a blank card.

"Nova pergunta" opens a form: answer type select, bilingual question, bilingual hint, and an options textarea (one per line, only meaningful for escolha múltipla — hide it for other types). EN falls back to PT when empty, as everywhere else.

A `--color-primary-tint` note at the bottom warns that longer questionnaires get fewer answers and that four to six questions is the practical ceiling. Keep it — it's the only thing standing between Maria and a twenty-question form.

Reordering questions is not designed in this pass. It will be wanted; drag handles on the list rows are the place.

## Profile entry point

A card on the profile: heading "Questionário", a line explaining the answers help Maria prepare and can be changed at any time, and a secondary "Ver questionário" button. Permanent, not a dismissible nudge.

## Email

The first-lesson confirmation email gains a section below the lesson details: one line of context and a secondary button to the tokenised link. Do not make it the email's primary action — the confirmation itself is. Subsequent confirmations do not repeat it.

## Data model

- `question` — `id`, `scope` (`common` | `service:<id>`), `type` (`short_text` | `long_text` | `multi_choice` | `yes_no`), `label_pt`, `label_en`, `hint_pt`, `hint_en`, `options` (json, multi_choice only), `follow_up_question_id` (nullable, shown when the answer is yes), `position`, `active`.
- `answer` — `student_id`, `question_id`, `value` (text or json array), `answered_at`. Never delete answers when a question is edited; version the question instead, or Maria loses history.
- `student` — a ficha, with `account_id` (the owner, possibly a guardian), `name`, `birth_date`, contacts, and `private_notes`. An account may own several fichas.
- `booking.attendee` should reference a `student` so lesson history accumulates on the ficha instead of on free-text attendee names.

That last point is the one migration with teeth: attendees are currently free text, and the Alunos tab is only useful once they resolve to student records.
