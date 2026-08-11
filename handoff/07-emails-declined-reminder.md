# 7 · Emails — Pedido não aceite + Lembrete 24h

Handoff apenas para os dois templates adicionados agora (os restantes já estão em implementação via `handoff/06-email.md`). Ambos já têm remetente/gatilho no código — `notifyDecision(kind, id, "declined")` e `sendReminder(bookingId)` em `src/lib/email/notifications.ts` — por isso **não há alterações de lógica**, apenas o corpo passa pela `emailLayout()` brandada (shell da 06: faixa de azulejos → cabeçalho `#173A75` com wordmark Lora → cartão branco → rodapé).

Preview de referência: `ui_kits/email/index.html`, tabs "4 · Pedido não aceite" e "7 · Lembrete 24h".

## 4 · Pedido não aceite (`Email.declined`)

Destinatário: cliente, no idioma do perfil. Assunto: `declined.subject` ("Pedido de aula não aceite" / "Lesson request not accepted").

Corpo (dentro do cartão branco da shell — `font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#22252B`):

```html
<p style="margin:0 0 16px;">Olá {name},</p>
<p style="margin:0 0 16px;">Infelizmente o seu pedido de <strong>{service}</strong> para <strong>{when}</strong> não pôde ser aceite.</p>
<!-- nota opcional da professora (notifications.ts já a acrescenta quando existe) -->
<p style="margin:0;font-style:italic;color:#6E7076;font-size:14px;">Nota da professora: {note}</p>
```

Regras:
- `{service}` e `{when}` a **bold** (ink `#22252B`), como nos restantes emails.
- Nota da professora: itálico, muted `#6E7076`, 14px — mesmo tratamento do email confirmado.
- **Sem CTA e sem caixa de detalhes** — é uma má notícia; não empurrar ação. (Se se quiser suavizar, um link de texto simples "Marcar outro horário" a `#2456A6` no fim, nunca botão.)

## 7 · Lembrete 24h (`Email.reminder`)

Destinatário: cliente, no idioma do perfil. Assunto: `reminder.subject` ("Lembrete: aula amanhã" / "Reminder: lesson tomorrow"). Disparo: cron horário existente (`src/app/api/cron/hourly/route.ts`), idempotente — nada a mudar.

```html
<p style="margin:0 0 16px;">Olá {name},</p>
<p style="margin:0;">Lembrete da sua aula de <strong>{service}</strong> em <strong>{when}</strong>. Morada: {address}.</p>
```

Regras:
- Curto de propósito — duas linhas, sem CTA (a informação útil é a hora e a morada; nada para o cliente fazer).
- Opcional (melhoria): mover a morada para a caixa de detalhes ivory (`#FAF7F2`, borda `#E8E2D9`, radius 12px) usada no email confirmado, para consistência visual. Se o fizerem, aplicar o mesmo bloco nos dois.

## Notas transversais (recap)

- Emails do cliente saem no idioma do perfil (PT/EN) — os templates acima existem nos dois em `messages/*.json`, sem novas chaves.
- Séries semanais usam estes mesmos templates com `{when}` = "terça-feira, 17:00, semanalmente" (via `formatSeriesWhen`) — um único email por série.
- Ocorrências canceladas por blockout não geram email (decisão existente; só aparecem no dashboard).
