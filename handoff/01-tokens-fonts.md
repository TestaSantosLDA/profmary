# 1 · Fonts + tokens

## 1.1 Fonts — `src/app/[locale]/layout.tsx`

The repo currently loads no fonts (`--font-sans` is unset, `--font-heading` aliases it). Load Lora + Source Sans 3 with `next/font`:

```tsx
import { Lora, Source_Sans_3 } from "next/font/google";

const lora = Lora({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-lora" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-source-sans" });

// on <html>:
<html lang={locale} className={`${lora.variable} ${sourceSans.variable}`}>
```

## 1.2 Tokens — `src/app/globals.css`

### `@theme inline` block — change two lines

```css
/* before */
--font-sans: var(--font-sans);
--font-heading: var(--font-sans);
/* after */
--font-sans: var(--font-source-sans);
--font-heading: var(--font-lora);
```

### `:root` block — replace the grayscale values

```css
:root {
  --background: #FAF7F2;            /* was oklch(1 0 0) */
  --foreground: #22252B;            /* was oklch(0.145 0 0) */
  --card: #FFFFFF;
  --card-foreground: #22252B;
  --popover: #FFFFFF;
  --popover-foreground: #22252B;
  --primary: #2456A6;               /* azulejo — was near-black */
  --primary-foreground: #FFFFFF;
  --secondary: #EAF0F8;             /* primary tint */
  --secondary-foreground: #2456A6;
  --muted: #F1EDE6;                 /* warm neutral tint */
  --muted-foreground: #6E7076;
  --accent: #C96F4A;                /* terracotta */
  --accent-foreground: #FFFFFF;
  --destructive: #A84D2B;           /* deep terracotta (legible error text) */
  --border: #E8E2D9;
  --input: #E8E2D9;
  --ring: rgba(36, 86, 166, 0.35);
  --radius: 0.75rem;                /* 12px cards; --radius-md ≈ 10px controls — was 0.625rem */
  /* ProfMary additions (not part of shadcn's set) */
  --primary-deep: #173A75;          /* hover, headers */
  --positive: #2E7D5B;              /* confirmed */
  --positive-tint: #E7F1EC;
  --warning: #B7791F;               /* pending */
  --warning-tint: #F7EFDE;
  --accent-tint: #F8ECE4;
  --danger-tint: #F8EAE3;
}
```

Add to `@theme inline` so Tailwind exposes the additions as utilities:

```css
--color-primary-deep: var(--primary-deep);
--color-positive: var(--positive);
--color-positive-tint: var(--positive-tint);
--color-warning: var(--warning);
--color-warning-tint: var(--warning-tint);
--color-accent-tint: var(--accent-tint);
--color-danger-tint: var(--danger-tint);
```

### `@layer base` — add heading + body defaults

```css
h1, h2, h3 { @apply font-heading font-semibold tracking-tight; }
body { @apply antialiased; line-height: 1.6; }
a { @apply text-primary; }
a:hover { @apply text-primary-deep underline underline-offset-3; }
```

Leave `.dark` untouched (dark mode is deferred per DESIGN.md); sidebar/chart vars can stay grayscale until used.
