# 8 · Mobile bottom nav + entrada de sessão no header

Resolve duas lacunas do site atual: (a) abaixo de 720px o nav do header desaparece sem substituto — Sobre/Preços/Contacto ficam inalcançáveis no telemóvel; (b) não existe entrada para "Entrar"/"As minhas aulas" em lado nenhum.

Referência visual: `components/layout/BottomNav.jsx` + kit `ui_kits/website/index.html` (chip "demo: sessão" para alternar estados).

## 8.1 NOVO `src/components/layout/bottom-nav.tsx`

Client component; visível só `<720px` (`min-[720px]:hidden`). Itens: Início `/`, Preços `/pricing`, Sobre `/about`, Contacto `/contact` + **"Aulas" `/dashboard` apenas com sessão** (recebe `loggedIn` por prop do layout server-side). "Marcar aula" NÃO entra aqui — continua como CTA do header (um primário por vista).

```tsx
"use client";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { House, Euro, UserRound, Mail, CalendarDays } from "lucide-react";

const ITEMS = [
  { href: "/", key: "home", Icon: House },
  { href: "/pricing", key: "pricing", Icon: Euro },
  { href: "/about", key: "about", Icon: UserRound },
  { href: "/contact", key: "contact", Icon: Mail },
] as const;

export function BottomNav({ loggedIn }: { loggedIn: boolean }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const items = loggedIn
    ? [...ITEMS, { href: "/dashboard", key: "dashboard", Icon: CalendarDays } as const]
    : ITEMS;
  return (
    <nav className="sticky bottom-0 z-20 flex justify-around border-t border-border bg-card pb-[env(safe-area-inset-bottom)] min-[720px]:hidden">
      {items.map(({ href, key, Icon }) => {
        const active = pathname === href;
        return (
          <Link key={key} href={href} aria-current={active ? "page" : undefined}
            className={`flex min-h-12 max-w-22 flex-1 flex-col items-center justify-center gap-0.5 rounded-[10px] py-1.5 no-underline hover:no-underline ${active ? "text-primary" : "text-muted-foreground"}`}>
            <Icon className="size-[22px]" strokeWidth={2} />
            <span className={`text-[11px] ${active ? "font-semibold" : "font-medium"}`}>
              {key === "dashboard" ? t("dashboard") : t(key)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
```

Nota de mensagens: `Nav.dashboard` já existe ("As minhas aulas" / "My lessons") mas é longo para uma tab — acrescentar `Nav.dashboardShort: "Aulas" / "Lessons"` e usar essa.

## 8.2 Montagem — `src/app/[locale]/layout.tsx`

O layout é server component: ler a sessão e passar como prop.

```tsx
const { data: { user } } = await (await createClient()).auth.getUser();
// ...depois de {children} e antes de <SiteFooter/>:
<BottomNav loggedIn={!!user} />
```

Com `position:sticky` + a nav como último elemento antes do footer, não é preciso padding extra no conteúdo; se ficar `fixed`, acrescentar `pb-16 min-[720px]:pb-0` ao `<main>`. Excluir das rotas `/admin` (o admin tem as suas tabs).

## 8.3 Desktop: entrada de sessão no header — `site-header.tsx`

À esquerda do LanguageSwitcher, um link de texto (14px):
- sem sessão → `Entrar` (`Auth.signIn`) → `/login`
- com sessão → `As minhas aulas` (`Nav.dashboard`) → `/dashboard`

Só ≥720px (`hidden min-[720px]:inline`) — no mobile a BottomNav cobre isto. O header passa a receber `loggedIn` do layout também.

## 8.4 Miudeza aproveitável

`site-footer.tsx`: `max-w-5xl` (1024px) → `max-w-[1040px]`, para alinhar com header e conteúdo.
