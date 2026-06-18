# 10 — Share & Export

**Goal:** make the public page trivially shareable — the whole growth strategy.
Copy link + native share in V1; PDF / Instagram-story export is optional polish.

**Depends on:** 08 (public page exists).

---

## V1 — Share (build this)

A **Share** affordance on:
- The grower's `/account` page ("Share my page").
- The public `/@handle` page (so florists can re-share).

### `app/components/Share/ShareButton.vue`
- Uses the **Web Share API** when available (`navigator.share({ title, text, url })`)
  — on mobile this opens the native sheet (WhatsApp, Instagram DM, Messages, etc.),
  which is exactly how growers currently distribute PDFs.
- Fallback (desktop / unsupported): copy-to-clipboard via VueUse `useClipboard`,
  with a toast "Link copied". Optionally show quick links: WhatsApp
  (`https://wa.me/?text=`), Instagram (copy + "paste in your story/bio"), email.
- `url` = absolute `https://<host>/@<handle>`. Build from `useRequestURL()` /
  runtime config so it's correct across envs.
- `text` = `"{farmName}'s flower availability on Stems"`.

### QR (nice-to-have, cheap)
A QR code of the public URL is genuinely useful at farm gates / markets. If cheap,
render one in a "Share" modal (small QR lib or a Worker that returns an SVG).
Optional for V1.

---

## V1.1 / optional — PDF & story export (defer unless time)

These ease the transition from the current PDF/WhatsApp workflow but are **not
required** for the wedge.

- **PDF export** ("this week's availability" sheet, Cornish-Fleuria-style table):
  generate from the live list. Cleanest on Workers = render an HTML template →
  PDF. Avoid heavy headless-browser deps; a lightweight HTML-to-PDF approach or a
  print-stylesheet + "Save as PDF" is acceptable for V1.1. Mark clearly if shipped.
- **Instagram story image** (1080×1920) summarising top flowers: a generated
  share card. Defer; this is marketing polish.

> Because availability is a **live** model (not weekly snapshots), any exported
> PDF is a point-in-time render — stamp it with the export date/time so it's clear
> it can go stale.

---

## Definition of done (V1)
- [ ] `<ShareButton>` on `/account` and `/@handle`.
- [ ] Native share sheet on mobile; clipboard fallback + toast on desktop.
- [ ] Shared URL is absolute and correct in every environment.
- [ ] PDF/story export either shipped-and-labelled or left as a documented stub.
- [ ] `npm run typecheck && npm run lint` clean.
