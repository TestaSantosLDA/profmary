# 11 — Home & About, photo-led

Home was a bare hero with two buttons. It now carries the trust content that was buried on About, and About is rebuilt around photography with roughly half the text. Voice throughout is first-person from Maria.

Every image is a **placeholder frame**, not an image. Nothing ships until real files replace them.

## New component — `Photo` (`components/media/Photo.jsx`)

```jsx
<Photo src alt note search ratio="4/3" radius={12} round showLabel style />
```

- With `src`: `<img>` at the given aspect ratio, `object-fit: cover`.
- Without `src`: a `--color-neutral-tint` frame at `--color-line`, radius 12, containing a 10px uppercase `--color-accent` "foto" label, the `note` (13px `--color-muted`, what the photo should show), and `search` (11px mono, suggested stock search terms).
- `round` → circle, 1/1. `showLabel={false}` → drops the "foto" label, for frames under ~64px.

Register it in the DS loader list after `TileBand`.

## Photo brief

Stock is acceptable but the risk is real: posed strangers grinning at laptops are the single fastest way to make this site read as generated. Selection rules — daylight, no studio white, no eye contact with the camera, Portuguese or at least European settings, one or two people maximum, and no visible text on screens. A real phone photo of Maria beats any stock portrait; the portrait frames are sized to swap in one.

| Slot | Ratio | Subject | Search |
|---|---|---|---|
| Home hero | 4/5 | Portrait of Maria, natural setting, soft light | `portuguese teacher portrait warm` |
| Home "how lessons work" | 5/4 | Lesson table: notebooks, coffee, two people talking | `language tutor lesson at table` |
| Home testimonial | circle 40px | Student avatar (optional — omit rather than fake) | — |
| About hero | 4/5 | Portrait of Maria | `portuguese woman teacher portrait` |
| About strip ×3 | 1/1 | Notebooks and coffee · Lisbon street with azulejos · Portuguese books | `notebook coffee study table`, `lisbon street azulejo tiles`, `portuguese language books` |

## Home structure (`ui_kits/website/Home.jsx`)

Section wrapper is `max-width: 1040px`, `padding: 0 20px`, centred. Tinted sections go full-bleed with the wrapper inside. `wide` breakpoint is 880px, matching Book.

1. **Tile band** (12px) — unchanged.
2. **Hero** — grid `1.15fr 0.85fr`, 48px gap, centred. Left: h1 at 3.1rem/1.08 (2.2rem mobile), `text-wrap: balance`, max 18ch; 19px lede in `--color-ink` at max 40ch; primary + secondary buttons in a wrapping flex row; 13px muted line "Respondo normalmente no próprio dia." Right: 4/5 portrait frame.
3. **Formats** — `--color-neutral-tint` band. Two white cards: "Ao domicílio" with a `+5,00€` tag in `--color-accent`, "Online" tagged "Incluído". Copy mirrors the Book mode picker, so the fee is never a surprise at checkout.
4. **Who I work with** — two cards, the audience copy previously on About.
5. **How lessons work** — grid, steps left with the numbered `--color-primary-tint` circles, 5/4 photo frame right.
6. **Price anchor + testimonial** — tinted band, grid `0.8fr 1.2fr`. Left card: uppercase kicker, `20,00€` at 40px display font with `/hora` baseline-aligned beside it, note, secondary button to Pricing. Right card: the quote in the display font at 22px, small round avatar + attribution, and a mono note marking it as placeholder.
7. **Close** — centred h2 + primary CTA, then a closing tile band.

The testimonial is **mock copy** ("Ana, holandesa") and labelled as such in-page. Replace with real quotes from Maria's two students before launch, or delete the block — do not ship an unlabelled invented quote.

## About structure (`ui_kits/website/About.jsx`)

Cut: the three-step "how lessons work" list (now on Home) and the long intro paragraph. Added: photography, a fact row, and a short voice paragraph.

1. **Hero** — grid `0.9fr 1.1fr`. Left: 4/5 portrait. Right: uppercase "Sobre mim" kicker, name at 2.6rem, `--color-primary` tagline, two 17px paragraphs at max 50ch, then a fact row above a `--color-line` rule: `10+ anos a ensinar` · `1 para 1 ou grupos pequenos` · `PT · EN · ES idiomas`.
2. **Who I work with** — tinted band, two short cards (one line each now).
3. **What lessons look like** — three 1/1 photo frames, then a centred 21px display-font paragraph at 44ch about how lessons run.
4. **Tile band**, then a centred CTA pair: "Marcar a primeira aula" + "Falar comigo primeiro" (→ Contact), with the draft-copy note below.

All copy is draft for Maria to approve, and the `note` line saying so stays in the design until she does. The facts row makes three factual claims — ten years, one-to-one/small groups, PT/EN/ES — confirm each before publishing.
