# Pendentes — inputs necessários (não são tarefas de código)

Atualizado a 2026-08-11. Itens que só tu (ou a Maria) podem resolver; o código
que depende deles está pronto ou anotado.

## Google Cloud (para o Calendar sync funcionar)

- [x] OAuth client, redirect URIs, `GCAL_TOKEN_KEY`, redeploy, app publicada —
      tudo confirmado a funcionar (o Ligar/Desligar foi testado com sucesso).
- [ ] **Voltar a ligar** o calendário em `/pt/admin/settings` (ficou desligado
      após o teste) — idealmente já com a conta Google da Maria. Na troca
      definitiva, pedir ao Claude o re-sync das aulas futuras confirmadas.
- [ ] Teste ponta-a-ponta: aprovar uma marcação e ver o evento aparecer no
      calendário; cancelar e vê-lo desaparecer.

## Conteúdo (Maria)

- [ ] `/pt/admin/content` — o novo separador **Conteúdo** edita as páginas
      Início e Sobre (textos PT/EN + fotografias). O antigo "Página Sobre"
      foi substituído; o que lá estava foi migrado.
- [ ] **Fotografias reais** para os 6 espaços (retrato ×2, mesa de aula,
      3 quadrados da página Sobre) — até lá as páginas mostram molduras
      cinzentas com sugestões de pesquisa de stock. Regras: luz natural,
      sem olhar para a câmara, ambiente português, sem texto em ecrãs.
- [ ] **Testemunho**: o da página inicial ("Ana, holandesa") é inventado e
      está marcado como provisório — substituir por um real dos alunos da
      Maria no separador Conteúdo, ou ocultar a secção.
- [ ] **Números da página Sobre**: "10+ anos", "1 para 1 ou grupos
      pequenos", "PT · EN · ES" foram inferidos — a Maria deve confirmar
      (ou corrigir no separador Conteúdo) antes do lançamento.
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
