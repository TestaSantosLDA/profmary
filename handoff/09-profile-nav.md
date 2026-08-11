# 9 · Perfil no mobile + tabs de sessão

Complementa o `08-bottom-nav.md`: com sessão iniciada, o cliente precisa de chegar às **aulas** e ao **perfil** — e Sobre/Contacto perdem prioridade (já é cliente). A página `/profile` e o `profile-form.tsx` **já existem no repo**; isto é só navegação.

## 9.1 `bottom-nav.tsx` — dois conjuntos de tabs

Em vez de acrescentar "Aulas" ao conjunto público (5+ tabs), o conjunto troca com a sessão:

```
logged out:  Início · Preços · Sobre · Contacto
logged in:   Início · Aulas · Preços · Perfil
```

```tsx
const PUBLIC = [
  { href: "/", key: "home", Icon: House },
  { href: "/pricing", key: "pricing", Icon: Euro },
  { href: "/about", key: "about", Icon: UserRound },
  { href: "/contact", key: "contact", Icon: Mail },
] as const;
const CLIENT = [
  { href: "/", key: "home", Icon: House },
  { href: "/dashboard", key: "dashboardShort", Icon: CalendarDays },
  { href: "/pricing", key: "pricing", Icon: Euro },
  { href: "/profile", key: "profileShort", Icon: UserRound },
] as const;
const items = loggedIn ? CLIENT : PUBLIC;
```

Mensagens novas: `Nav.dashboardShort: "Aulas" / "Lessons"`, `Nav.profileShort: "Perfil" / "Profile"`. Sobre/Contacto continuam alcançáveis via footer/home quando com sessão.

## 9.2 Header desktop — dropdown ou dois links

≥720px, com sessão: substituir o link único do 08 por dois links de texto à esquerda do LanguageSwitcher — `As minhas aulas` → `/dashboard` e `O meu perfil` → `/profile` (14px, muted → ink no hover, ativo em azulejo). Sem sessão: `Entrar` → `/login`, como no 08.

## 9.3 E quando a sessão é da Maria (admin)?

O perfil tem `is_admin` (tabela `profiles`); o layout já o pode ler junto com a sessão. Regras:

- **Bottom nav (mobile), fora de `/admin`**: terceiro conjunto de tabs — `Início · Pedidos (/admin) · Preços · Perfil`. O ícone de Pedidos pode ser `Inbox` (Lucide); mensagem nova `Nav.adminShort: "Pedidos" / "Requests"`.
- **Dentro de `/admin`**: a BottomNav esconde-se (como no 08) — o admin tem as suas pill tabs próprias com as 6 secções (Pedidos, Aulas, Serviços, Disponibilidade, Página Sobre, Definições — handoff `05-admin.md`).
- **Header desktop**: com `is_admin`, o link de sessão passa a `Administração` → `/admin` (+ `O meu perfil` continua disponível). A Maria também pode ter aulas como cliente? Não — não misturar: o dashboard de aluno fica fora do fluxo dela.
- **Perfil do admin**: a página `/profile` serve igual (nome, telefone, idioma); a "Morada das aulas" não se aplica à professora — esconder esse campo quando `is_admin`.

## 9.4 Página de perfil — restyle (já implementada)



`/profile` só precisa do tratamento visual do design system (referência: `ui_kits/website/Profile.jsx`):
- Coluna 480px; Card 1: Nome, Telefone, Idioma (Select), Morada das aulas (Textarea + hint) + Guardar (primário) + "Alterações guardadas." em `text-positive`.
- Card 2: "Alterar palavra-passe" (h2 1.15rem) + Nova palavra-passe + botão outline.
- "Sair" como botão ghost no fim, fora dos cards.
