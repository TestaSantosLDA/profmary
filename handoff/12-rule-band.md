# 12 — `RuleBand` replaces `TileBand` on the site

The azulejo tile band read as noise at 12px and was rejected. The signature divider is now a ruled band: two thin blue rules with a terracotta margin line, after the ruling of a Portuguese exercise book. It keeps the palette, adds the stationery warmth the tile band lacked, and the margin line does structural work by tracking the content column.

`TileBand` stays in the library, unused on the site. Do not delete it — decide later whether the azulejo motif returns anywhere.

## `components/brand/RuleBand.jsx`

```jsx
<RuleBand height={24} tone="blue" align="page" maxWidth={1040} inset={20} margin />
```

| prop | default | meaning |
|---|---|---|
| `height` | 20 | band height in px |
| `tone` | `"blue"` | `"blue"` on light backgrounds, `"ivory"` on the deep-blue email header |
| `align` | `"page"` | `page` = margin line tracks the centred content column; `edge` = fixed inset from the viewport edge |
| `maxWidth` | 1040 | content-column width used by `align="page"` |
| `inset` | 20 | margin line offset from the column's (or viewport's) left edge |
| `margin` | `true` | set false for rules only |

Structure: a `position: relative` box of `height`, containing

- rule 1 — 1px, `--color-primary` at 0.4 opacity, `top: round(height * 0.4)`
- rule 2 — 1px, `--color-primary` at 0.2 opacity, `top: round(height * 0.72)`
- margin line — 2px wide, `--color-accent` at 0.75 opacity, full height, at `inset`

Both rules are full-bleed. With `align="page"` the margin line lives inside an absolutely-positioned `max-width` wrapper with `margin: 0 auto`, so at `inset: 20` it lands exactly on the left edge of the page's text column on wide screens and 20px from the viewport edge on narrow ones. `tone="ivory"` swaps to `rgba(255,255,255,…)` — 0.55 / 0.28 rules, 0.75 margin.

Decorative: `aria-hidden="true"`, no semantic role.

## Where it's used

| Location | Call |
|---|---|
| Home, under the header | `<RuleBand height={24} />` |
| Home, before the closing CTA band | `<RuleBand height={24} />` |
| About, before the closing CTA | `<RuleBand height={24} />` |
| `EmailHeader`, above the blue block | `<RuleBand height={16} align="edge" inset={28} />` |

`inset={28}` on the email header matches the header block's 28px horizontal padding, so the margin line aligns with the wordmark.

## Email caveat

`RuleBand` uses absolute positioning, which Outlook's rendering engine handles badly. For the transactional emails, build it as a three-row table instead of porting the component:

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td height="10" style="line-height:10px;font-size:0;">&nbsp;</td></tr>
  <tr><td height="1" bgcolor="#A9BEDC" style="line-height:1px;font-size:0;">&nbsp;</td></tr>
  <tr><td height="6" style="line-height:6px;font-size:0;">&nbsp;</td></tr>
  <tr><td height="1" bgcolor="#D3DEEE" style="line-height:1px;font-size:0;">&nbsp;</td></tr>
  <tr><td height="6" style="line-height:6px;font-size:0;">&nbsp;</td></tr>
</table>
```

`#A9BEDC` and `#D3DEEE` are `--color-primary` flattened at 0.4 and 0.2 over white — email clients get no CSS variables and unreliable opacity. Skip the terracotta margin line in email; a 2px vertical rule is not worth the table nesting.
