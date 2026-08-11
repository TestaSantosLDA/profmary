# Pendentes — inputs necessários (não são tarefas de código)

Atualizado a 2026-08-11. Itens que só tu (ou a Maria) podem resolver; o código
que depende deles está pronto ou anotado.

## Google Cloud (para o Calendar sync funcionar)

- [ ] Ativar a **Google Calendar API** no projeto (APIs & Services → Library).
- [ ] Adicionar redirect URIs ao OAuth client:
      `https://profmary.vercel.app/api/gcal/callback` e
      `http://localhost:3000/api/gcal/callback`.
- [ ] Criar `GCAL_TOKEN_KEY` e adicionar à Vercel + `.env.local` (no teu terminal):
      ```
      KEY=$(openssl rand -hex 32)
      echo "GCAL_TOKEN_KEY=$KEY" >> .env.local
      for e in production preview development; do printf "$KEY" | vercel env add GCAL_TOKEN_KEY $e; done
      ```
- [ ] Redeploy na Vercel (as envs só entram no próximo deploy).
- [ ] `/pt/admin/settings` → **Ligar Google Calendar** (a conta ligada é o alvo
      do sync; na troca definitiva para a conta da Maria, pedir ao Claude o
      re-sync das aulas futuras).

## Conteúdo (Maria)

- [ ] `/pt/admin/about` — foto, nome, profissão, descrição + listas
      "Com quem trabalho" e "Como funcionam as aulas".
- [ ] `/pt/admin/services` — preços e descrições reais.
- [ ] `/pt/admin/availability` — horário semanal real.
- [ ] Email e telefone de contacto públicos → dar ao Claude para preencher em
      `src/app/[locale]/contact/page.tsx` (os cartões estão escondidos até lá).
- [ ] Rever copy PT em `messages/pt.json` (o EN é espelhado depois).
- [ ] Rever a política de privacidade (`/pt/privacy`) — rascunho feito pelo
      Claude; deve ser validada por um humano antes do lançamento.

## Lançamento

- [ ] Comprar o domínio e dizer qual é (Claude configura Vercel + DNS steps).
- [ ] Verificar o domínio na **Resend** (Claude dá os registos DNS) e mudar
      `EMAIL_FROM`.
- [ ] Depois da Resend: configurar SMTP custom no Supabase
      (Settings → Auth → SMTP, smtp.resend.com, user `resend`,
      pass = RESEND_API_KEY) e correr
      `python3 scripts/supabase-auth-email-templates.py` para aplicar os
      templates de auth brandados (bloqueado no free tier até haver SMTP).
- [ ] Conta da Maria criada no site com o email real → Claude promove a admin.
- [ ] Decisão: sync dos componentes de design para o projeto Claude Design
      (task 9b.5) — Claude aguarda OK explícito.
