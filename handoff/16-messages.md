# 16 — Mensagens (chat aluno ↔ Maria)

Real-time 1-to-1 messaging between each account and Maria. Reference kits: `ui_kits/website/Messages.jsx`, `ui_kits/admin/Messages.jsx`, `ui_kits/admin/Students.jsx` (ficha panel), `components/layout/SiteHeader.jsx` (header entry + unread badge).

## Suggested OpenSpec framing

This is large enough to be several changes rather than one. Proposed split, in dependency order:

| OpenSpec change | Covers |
|---|---|
| `add-messaging-core` | `conversation` / `message` tables, send + list + read receipts, student page, admin list + thread, header entry |
| `add-messaging-attachments` | file, image and in-app audio recording, storage, size/type limits |
| `add-messaging-realtime` | live delivery, typing indicator, presence, unread counts pushed |
| `add-messaging-notifications` | the two emails, plus the 24h overdue flag and its digest |
| `add-messaging-triage` | pin, archive, search, "por responder" filter |

Core must land first; the other four are independent of each other. Ship core with polling if realtime is not ready — the design does not change, only the transport.

Capability names to add under `openspec/specs/`: `messaging` (threads, messages, editing), `messaging-attachments`, `messaging-notifications`. Existing capabilities touched: `bookings` (the booking events rendered inside the thread), `students` (the ficha panel), `notifications` (email templates).

## The rules this design is built on

- **One continuous thread per account.** Not per booking, not per lesson. A student who has been with Maria for two years has one scroll of history. Booking activity appears *inside* that thread as system events, so context is never lost by opening a new fio.
- **Guardian accounts share the thread.** Minors are fiches inside a guardian account (handoff 14), so the conversation belongs to the account. Both the guardian and the child write in the same fio. The design shows this plainly rather than hiding it — the student page carries the line "Esta conversa é partilhada com o encarregado de educação."
- **Anyone registered can write at any time.** No gating on having a booking. A prospective student who signed up yesterday can ask a question.
- **Maria's fear is the product requirement.** She is afraid a student waits more than 24 hours. That is the only SLA signal in the design: a conversation whose last message is from the student and is older than 24h is flagged red in her list, with the waiting time in hours. No auto-replies, no away messages, no promises to the student about response time beyond the soft "Responde normalmente no mesmo dia".
- **Real-time.** Typing indicator, delivered/read state, live arrival.
- **Editing, not deleting.** A message can be edited for 5 minutes after sending, then it is fixed. Nothing is deleted by either side. This keeps the record intact for a service where money and scheduling are discussed, while still forgiving a typo.
- **Both sides get email.** The student when Maria replies; Maria when a message arrives. Emails are per message, not digested — Maria's whole worry is latency, and a digest adds latency.

## Website

### Entry points

Two, per the client's choice:

1. **Header icon** — a 38×38 rounded-10 outline button before the language switcher in `SiteHeader`, a Lucide `message-square` at 20px stroke 1.6. Unread count sits as a `--color-primary` pill badge at `top:-5px; right:-5px`, min 18px, white 11px semibold. The button renders only when the user is signed in (in the kit, only when `onMessages` is passed). Active state colors the glyph `--color-primary`.
2. **"Falar com a Maria"** on a booking's page — a secondary button that opens the thread. Not yet built in the kit; it should prefill nothing, just open the fio. The booking context is already visible there as a system event.

On mobile the header icon stays (it is outside the collapsed nav). `BottomNav` is not changed — five items is already the ceiling.

### `/messages`

Max-width 480, same shell as Perfil.

**Header row**: 46px circular avatar with initials `MS` on `--color-primary-tint`, then "Maria Santos" at 1.35rem display and "Responde normalmente no mesmo dia" at 13px muted. This is a soft expectation, not a promise — do not turn it into a computed average.

**Thread** is a `Card` with `padding={0}` and `overflow:hidden`, the message area on `--surface-page` so the white bubbles read against it, 16px padding, 14px gap.

Three kinds of thread items:

- **Day separator** — centered 12px muted text ("9 de agosto", "Ontem"). Group by local day.
- **System event** — centered, max 40ch, 8×14px padding, full pill, `1px dashed --color-line`, white surface, 13px muted: `Aula marcada — quarta, 12 de agosto, 16:30 · online`. Events to render: booking requested, confirmed, declined, cancelled, rescheduled, pack activated. Nothing else — this is context, not an activity log.
- **Message bubble** — max `min(80%, 42ch)`, 10×14px padding, 16px radius with the near corner cut to 4px. Mine: `--color-primary` background, white text, no border, right-aligned, bottom-right corner cut. Theirs: white, `1px --color-line`, ink text, left-aligned, bottom-left corner cut. Stamp below at 11px muted, aligned with the bubble: `14:02`, then ` · editada` if edited, then ` · lida` on my own messages once read.

**Attachment bubbles** keep the bubble chrome and swap the contents:

- *File* — 34×34 rounded-8 tile with the extension in 11px bold (on `rgba(255,255,255,.2)` inside my blue bubble, `--color-neutral-tint` in theirs), then filename 14px semibold and `PDF · 240 KB` at 12px, 0.75 opacity.
- *Image* — same bubble, image at `border-radius:12px`, max-height 240, `object-fit:cover`, tap to open full size. (Designed as a variant of the file bubble; build it as its own branch.)
- *Audio* — 32px circular play button, then a 14-bar waveform (3px wide bars, 2px radius, heights varying 7–24px) and the duration at 12px. Bars are `rgba(255,255,255,.65)` in my bubble, `--color-line` in theirs. The waveform is decorative in the kit; when built, generate it from the real peaks or keep a fixed pattern — do not fake a progress state that does not track playback.

**Typing indicator** sits as the last item, left-aligned: three 6px `--color-line` dots then "a escrever…" at 13px muted.

**Composer** is inside the same card, above the fold of the page: `1px --color-line` top border, `--color-surface` background, 12px padding. Row of, left to right: 44×44 attach button (paperclip), 44×44 record button (mic), the textarea, 44×44 send button in `--color-primary` with a white paper-plane. The textarea is `rows={1}`, min-height 44, max-height 120, `resize:none`, 12×14px padding, 12px radius, `--surface-page` background, 15px/1.4 — it grows with content up to the cap, then scrolls. Below the row, 12px muted: "Pode editar uma mensagem até 5 minutos depois de a enviar."

Enter sends, Shift+Enter newlines on desktop; on touch, Enter newlines and send is the button only.

**Audio recording** is in-app, not an upload. Not drawn yet — build it as a composer state swap: pressing the mic replaces the row with a red dot + elapsed timer + a live waveform, a "cancelar" ghost on the left and a send button on the right. Recording must be cancellable without sending, and nothing is uploaded until send. Cap at 3 minutes.

**Empty state**: the thread area shows one centered muted line, "Escreva a primeira mensagem. A Maria responde por aqui." The composer stays enabled.

### Copy

Both languages are in the kit's `T` map. English mirrors: "Usually replies the same day", "Write a message", "You can edit a message up to 5 minutes after sending.", "This conversation is shared with the guardian."

## Admin

### Mensagens tab

New tab between **Alunos** and **Conteúdo**.

**List view.** Title, then the standing note "Uma conversa por conta. Nas contas de encarregado, o educando escreve no mesmo fio."

If any conversation is overdue, an alert `Card` above everything with `borderColor: --color-danger`: `N conversa à espera há mais de 24 horas` in 14px semibold danger, then "Marcadas a vermelho na lista. Só some quando responder." Do not make it dismissible — the whole point is that it persists until she answers.

Then a search input with an inset search glyph at `left:12px` (`paddingLeft:40`), filtering by name. Then filter pills in the existing admin pill style: **Todas** / **Por responder** / **Arquivadas**.

Then the conversation list, a `padding={0}` Card with rows separated by `1px --color-line`:

- 3px left border: `--color-danger` when overdue, transparent otherwise, so rows stay aligned.
- Unread rows get a `--color-primary-tint` background and a semibold name.
- 40px avatar with initials, name, optional "fixada" tag at 11px, the timestamp right-aligned at 12px muted.
- Second line, only for guardian accounts: `Emma Weber · educanda` at 12px muted.
- Preview line, single line with ellipsis, 14px, ink when unread and muted when read. Maria's own last message is prefixed `Maria: `. Non-text messages preview as `Áudio · 0:34`, `PDF · exercicio-4.pdf`, `Imagem`.
- Overdue rows add `Sem resposta há 25h` at 12px semibold danger.
- Unread badge right, min 20px pill, `--color-primary` on white text.

Sort: pinned first, then most recent activity. Archived conversations are excluded from Todas and Por responder; opening an archived conversation and replying un-archives it automatically.

"Por responder" means unread — messages Maria has not opened. It is deliberately not "not replied to": she often reads and answers in person at the next lesson.

**Thread view.** Back link, then a 44px avatar, name, `Conta de aluno` or the guardian sub-line, presence ("online agora"), and a secondary "Ver ficha" that jumps to the student's ficha. The thread body and composer are exactly the student's, mirrored: Maria's messages are the blue right-aligned ones. Below the card, two ghost actions: "Fixar conversa" and "Arquivar".

Pin is a per-conversation flag for Maria only. Archive hides it from the default list; it never deletes.

### Ficha do aluno

A "Mensagens" card between Pack de aulas and Notas privadas. Header row with the title and, when applicable, a `warn` tag "Por responder há 25h". Then the standing note, then a `1px --color-line` top rule and the last message: `Ontem 08:40 · Ana Silva` at 13px muted, the message in 15px quoted, then a primary "Responder" that opens the same thread in the Mensagens tab.

This is a window onto the same conversation, not a second inbox. Do not build a separate composer here.

## Notifications

Two transactional emails, in the existing email shell (`components/email/EmailHeader.jsx`, handoff 06):

- **To the student, when Maria replies.** Subject `Nova mensagem da Maria` / `New message from Maria`. Body: sender, the message preview (plain text, truncate at ~300 chars, attachments rendered as "Enviou um ficheiro: exercicio-4.pdf"), and a "Ver mensagem" button to `/messages`.
- **To Maria, when a message arrives.** Subject `Nova mensagem de {nome}`. Same shape, deep-linking to the admin thread.

Both are debounced: at most one email per conversation per 15 minutes, so a burst of four messages sends one email. Do not send when the recipient has the thread open and has already read the message.

The 24h overdue flag lives in the UI only. If a nudge is wanted later, one daily email to Maria listing overdue conversations is the right shape — never one per conversation.

## Data model

- `conversation` — `account_id` (unique; one per account), `last_message_at`, `last_message_preview`, `last_message_sender` (`student` | `teacher`), `unread_teacher` (int), `unread_student` (int), `pinned` (bool, Maria's flag), `archived` (bool), `created_at`.
- `message` — `conversation_id`, `sender_type` (`student` | `teacher`), `sender_user_id` (which person in a guardian account actually wrote it), `body` (nullable for pure-attachment messages), `kind` (`text` | `file` | `image` | `audio` | `event`), `created_at`, `edited_at` (nullable), `read_at` (nullable), `deleted_at` (unused for now, reserved).
- `message_attachment` — `message_id`, `storage_path`, `mime`, `bytes`, `original_name`, `duration_ms` (audio), `width`/`height` (image), `waveform` (nullable JSON array of peaks).
- `message_event` — or a `kind='event'` message with `event_type` (`booking_requested` | `booking_confirmed` | `booking_declined` | `booking_cancelled` | `booking_rescheduled` | `pack_activated`) and `booking_id` / `pack_purchase_id`. Prefer the second: events living in the `message` table keeps ordering trivial and the thread a single query.

`sender_user_id` matters. In a guardian account the fio is shared, so the ficha and the admin list need to say *who* wrote — "Emma Weber · educanda" is derived from it.

Unread counters are caches; the truth is `read_at` on messages. Recompute on read, and never let the badge outlive an opened thread.

Overdue is computed, not stored: `last_message_sender = 'student' AND last_message_at < now() - 24h AND NOT archived`. Doing it as a query means no job can leave a stale red flag.

Edit window: enforce server-side. Reject an edit when `now() - created_at > 5 minutes`, and set `edited_at` so the client can show "editada". Do not allow editing attachments — only `body`.

## Access, storage, retention

- A student reads and writes only their own account's conversation. Maria reads all. There is no student-to-student route at any layer — do not add a generic "conversations between users" abstraction that would make one possible later by accident.
- Attachments go to private storage with signed, short-lived URLs; never public buckets. Limit: 10 MB per file, images and PDFs and common audio only.
- Minors: the guardian can read everything in the fio by design, and the shared-thread line on the student page states it. Retention follows the account — deleting an account deletes the conversation and its attachments.

## Build order

1. `conversation` + `message`, admin list + thread, student page, header entry, text only, polling.
2. Read receipts and unread counts, then the overdue flag (a query and a red border — cheap, and it is the client's main worry).
3. Emails, debounced.
4. Attachments: files and images first, audio recording last (it needs `MediaRecorder`, a cancel state, and a waveform).
5. Pin, archive, search, filter.
6. Realtime transport swapped in under the same UI.

## Not designed in this pass

The active recording state of the composer, the image bubble (specified above but not drawn), the "Falar com a Maria" button on the booking page, and the admin's desktop two-pane layout — the kit is 390px-first, and at ≥900px the list and thread should sit side by side rather than as two screens.
