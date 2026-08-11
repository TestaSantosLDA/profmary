# 6 · Transactional email

Reference: `ui_kits/email/index.html` (full "Aula confirmada" sample, table-based).

## `src/lib/email/send.ts` — `emailLayout()`

Wrap the current body HTML in the branded shell. All styles inline (email clients); 600px column on `#F1EDE6`:

1. **Tile band** (10px) — inline SVG works in most clients, but for Outlook safety render it as a 10px-tall `<td>` with a repeating background image: export the pattern once as PNG (`tile-band-600x10.png`, from the design project's band) and host it in Supabase Storage; fallback `bgcolor="#2456A6"`.
2. **Header**: `<td bgcolor="#173A75" style="padding:20px 28px"><span style="font-family:Lora,Georgia,serif;font-weight:600;font-size:22px;color:#fff">ProfMary</span></td>` (system serif fallback is acceptable — don't webfont emails).
3. **Body card**: white, `padding:28px`, `font-family:'Source Sans 3',Helvetica,Arial,sans-serif` (falls back to Helvetica), 15px/1.6, ink `#22252B`.
4. **Details box** (address/price in `confirmed.details`): ivory `#FAF7F2`, 1px `#E8E2D9` border, 12px radius, muted text.
5. **CTA button** (admin "Abrir pedidos pendentes", student "Ver as minhas aulas"): `<td bgcolor="#2456A6" style="border-radius:10px"><a style="display:inline-block;padding:13px 24px;color:#fff;font-weight:500;text-decoration:none">…</a></td>`.
6. **Footer**: 12px muted "© {year} ProfMary — Aulas de Português".

Teacher notes keep the current `<em>` treatment, styled muted italic 14px. No other changes to `notifications.ts` — it already builds bodies from the `Email.*` messages.
