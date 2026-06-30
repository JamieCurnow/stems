# Handoff: How it works page redesign

## Overview
The **How it works** page (`/how-it-works`) is a public marketing page. Its job is to let a time-poor grower understand, in under a minute, what Stems is and how it works, then decide it's worth signing up. This redesign restyles the existing plain page to sit alongside the Stems landing page / brand system, and **adds a new section on orders & invoices** (the existing page does not mention invoicing at all).

This handoff covers a **mobile** and a **desktop** version.

## About the design files
The file in this bundle (`Stems How It Works.dc.html`) is a **design reference created in HTML** — a prototype showing the intended look and behaviour. It is **not** production code to copy directly.

This design maps onto an **existing Nuxt 3 + Vue 3 + Nuxt UI (Tailwind v4) codebase**. A `/how-it-works` page already exists and is the page to update. The task is to **bring that existing page up to this redesign** using the codebase's established patterns, components, and tokens — not to introduce new CSS or a parallel styling approach. Concretely:

- Page: `app/pages/how-it-works.vue` (currently a slim text page on the `default` layout)
- Layout chrome: `default` layout (Stems wordmark + sign-in / nav) — keep it
- Tokens: `app/assets/css/main.css` (`@theme static`) + `app/app.config.ts`
- Brand reference: `DESIGN.md`
- Related real surfaces to mirror, not reinvent: the public profile (`app/pages/@[handle]/`) for the phone-preview content, and invoices (`app/pages/invoices/`) for the invoice card.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, and layout. Recreate pixel-faithfully using the existing Nuxt UI components and Stems tokens. The hex values below are the source tokens — **prefer the semantic aliases** (`text-muted`, `border-default`, `bg-primary`, `text-primary`, …) over raw hex. The existing page's copy strings (the four steps, the three reassurances) are already in `how-it-works.vue` and match this design — reuse them.

---

## Screens / Views

Both versions share the same content spine, top to bottom:

1. **Hero** (floral wash) — eyebrow "How it works", display headline "Your flowers, on one link", supporting paragraph.
2. **Four numbered steps** — claim → list → share → get contacted.
3. **The page preview / "one clean link"** — what a grower's public page looks like + the `stems.market/@you` link idea.
4. **Orders & invoices** (NEW) — the invoice card + how billing works.
5. **Reassurance facts** — no commission / no middleman / set up in an evening.
6. **Closing CTA** (floral wash) — "Ready to set up your page?" + two buttons.
7. **Footer.**

### 1. How it works — Mobile (430px column)
Single scrolling column. A slim header (Stems wordmark left, "List your flowers" pill right) sits above the hero — in the real app this is the `default` layout chrome, so don't rebuild it inside the page.

- **Hero** — centred. Full-bleed blurred `hero-flowers.svg` background with a white gradient wash fading to solid white at the bottom (`scale(1.18)`, `blur(24px)`). Eyebrow "How it works" (Inter 600, 11px, `tracking-[0.32em]`, uppercase, `text-primary`). Headline "Your flowers, on one link" (EB Garamond 500, ~42px, `leading-[1.02]`, `text-default`). Sub paragraph (Inter 400, 15px, `text-muted`, `max-w-[280px]`).
- **Steps** — borderless rows on hairline dividers (`divide-y divide-default`). Each row: a 44px `peach-100` circle holding a Lucide icon in `peach-700`, with the two-digit numeral (`01`–`04`, EB Garamond, `#C9A99E`) stacked beneath it, then title (EB Garamond 500, 20px) + body (Inter 400, 14px, `text-muted`).
- **Page preview band** — `peach-50`/`#FEF5F3` background. Eyebrow + headline, then a **262px phone mock** (dark bezel, `rounded-[42px]`) showing a grower profile: green availability-banner, peach initials avatar, farm name, @handle · area, a "Contact" pill, an availability count, and a list of flower rows (image tile + name + meta + availability · price). Caption beneath.
- **Orders & invoices** (NEW) — white, centred. Eyebrow "Orders & invoices", headline "Got an order? Send an invoice in seconds.", explanatory paragraph, then the **invoice card** (see component below), max-width 330px.
- **Facts** — three label/value rows on hairline dividers; the label is `text-primary` uppercase 11px, value is `text-default` 14px.
- **CTA** — a `#FEF5F3` rounded panel (`rounded-[18px]`) with headline, paragraph, and two stacked full-width pill buttons ("List your flowers" solid primary; "See growers on Stems" white + `border-default`).
- **Footer** — centred wordmark, "Local · Seasonal · Grown" eyebrow, nav row.

### 2. How it works — Desktop (1280px frame, content `max-w` ≈ 1120px, `px-14`)
Same spine, widened. Differences from mobile:

- **Hero** is **two-column**: left column holds the eyebrow / headline (EB Garamond ~58px) / paragraph / two CTAs ("List your flowers" + a text "See a live page →" link); right column holds a **300px phone mock** (taller, 600px screen) with the same grower-profile content. Full nav bar above (wordmark + How it works / About / Blog / Policies + Sign in + "List your flowers" pill).
- **Steps** are a **4-up grid** (`grid-cols-4`, gap ~34px). Icon circle (54px) and numeral sit on one row; title (EB Garamond 22px) + body below. Centred section header above ("Four steps" eyebrow + "From the cutting patch to one link").
- **"One clean link" band** — `#FEF5F3`, centred: eyebrow, headline "A page that works the moment you share it", a white `rounded-full` pill showing `stems.market/@you` (the `@you` in `text-primary`), and a paragraph.
- **Orders & invoices** (NEW) — **two-column**: left is the copy (eyebrow, headline, paragraph, three green-check bullet points); right is the **invoice card** (420px). 
- **Facts** — **3-up grid** on a `border-top`.
- **Closing CTA** — full floral-wash band, centred headline (~44px), paragraph, two pill buttons side by side.
- **Footer** — wordmark + tagline left, nav right.

---

## Invoice card component (NEW)
A self-contained card summarising one invoice. Mirror the real invoice domain (`app/pages/invoices/[id]/`) — don't invent fields.

- Container: white, `1px` `border-default` (`#EFE7E2` warm hairline is fine), `rounded-[14px]` (mobile) / `rounded-2xl` (desktop), soft elevation (`shadow` ~ `0 18px 44px -22px rgba(33,30,26,.28)`), padding ~`20–28px`.
- **Header row:** left — "Invoice" (EB Garamond 500, `tracking-[0.14em]`, uppercase) + invoice number "INV-0007" (Inter 500, `text-muted`); right — a **status pill** "Paid" using `success` (sage) tint: `bg-success/12` text `text-success` (`#5C7F5A`), `rounded-full`.
- **Billed to:** small uppercase label (`text-dimmed`) + buyer name "Mevagissey Flowers" (Inter 500, `text-default`).
- **Line items:** rows on hairline dividers, each: "{Flower} · {n} stems" left (`text-default`, the "· n stems" portion `text-dimmed`), price right (Inter 500, `tabular-nums`). Example items: Cosmos · 40 stems → £32.00, Sweet peas · 30 stems → £15.00, Cornflower · 60 stems → £18.00.
- **Total row:** `border-top`, "Total" (EB Garamond 500) + amount (Inter 500, `tabular-nums`, larger). £65.00.
- **Footer hint:** small `text-dimmed` line with a flower icon — "Pulled straight from your flower list".

The intended product story: a grower saves buyers as contacts, then bills them **straight from their flower list** — pick stems, set amounts, send, and **mark paid**. Keep that wording aligned with the real invoices feature.

---

## Interactions & behaviour
This is a **static marketing page** — no data fetching, no app state. Behaviour is limited to:

- **CTA navigation:** "List your flowers" → `/login` (existing). "See growers on Stems" / "See a live page" → `/discover` (or a real `/@handle` for the live page link). Nav + footer links → `/about`, `/blog`, `/policies`, `/how-it-works`.
- **Hover:** buttons and links ~200ms transitions, matching existing `UButton` behaviour. Text links → `text-primary` / slight opacity on hover.
- **Responsive:** the two layouts in the file are the **mobile** and **desktop** ends of one responsive page — collapse the desktop two-column hero, 4-up steps grid, and two-column invoices section to the single stacked column at the `sm`/`md` breakpoint. Use the codebase's existing breakpoints.
- The phone mock and invoice card are **presentational** — static example content, no interactivity needed.

## State management
None. Public page on the `default` layout, no auth, no API calls. (The existing `how-it-works.vue` already has `definePageMeta({ layout: 'default' })` and `useSeoMeta(...)` — keep both; extend the SEO description to mention invoicing.)

## Design tokens
Source: `app/assets/css/main.css` (`@theme static`), aliased in `app/app.config.ts`. Prefer the semantic aliases in code.

- **Primary / peach:** `peach-100 #FCE8E3` (step-icon fill, soft fills), `peach-500 #E87767` (`primary` — CTAs, eyebrows, active nav, links), `peach-700 #B6483B` (icon glyph on light peach). Soft peach wash `#FEF5F3` for the preview / CTA bands.
- **Neutral / clay:** page bg `#FFFFFF`; `clay-200 #E9E5DE` (`border-default` hairlines; warmer `#EFEBE4`/`#EFE7E2` also used on cards); `clay-500 #847B6E` (`text-muted`); `clay-900 #211E1A` (`text-default` ink); `text-dimmed` ≈ `#A89F92`; numerals on steps `#C9A99E`.
- **Semantic:** `success` = sage `#5C7F5A` — only the "Paid" invoice pill, the green check bullets, and the in-season dot. Never a lead colour.
- **Type:** display = **EB Garamond** (`font-display`) — wordmark, headlines, step titles, "Invoice"/"Total", farm names. Body/UI = **Inter** — paragraphs, eyebrows, labels, meta, buttons, prices (`tabular-nums` for money).
- **Radius:** content cards `rounded-2xl`/`rounded-[14px]`; pills/buttons/avatars `rounded-full`; phone bezel `rounded-[42–46px]`.
- **Elevation:** content reads on hairline dividers; the phone mock, invoice card and CTA panel may carry a soft shadow — that's allowed for those, not for the step rows.
- **Spacing:** desktop sections ~`py-[84–90px]`, content `max-w-[1120px]`, `px-14`. Mobile sections ~`py-[40–48px]`, `px-7`.

### Brand guardrails (from `DESIGN.md` — do not reintroduce)
Pure-white page canvas (the peach wash bands are fine; no cream/beige page background); no shadowy/boxed content cards for the steps; the accent is **coral-peach, not orange**; no Fraunces or quirky display serifs; green is a quiet semantic colour only, never the lead accent; no em-dashes and UK spelling in copy (per `marketing/00-foundations/brand-voice.md`).

## Assets
- `assets/hero-flowers.svg` — the blurred floral wash used in the hero and closing CTA. In the live app this is served from `/hero-flowers.svg` (`public/hero-flowers.svg`) — reuse the existing one, don't ship a copy.
- Icons: **Lucide** via Nuxt UI / Iconify — e.g. `i-lucide-flower-2`, `i-lucide-message-circle`, `i-lucide-share-2`, `i-lucide-link`, `i-lucide-check`, `i-lucide-arrow-right`. (The SVGs inlined in the prototype are stand-ins; use the Lucide equivalents.)
- The phone mock's flower-tile images are gradient placeholders in the prototype — in the real app use actual listing photos via the existing image pipeline (`roadmap/06-image-pipeline.md`).
- Fonts: EB Garamond + Inter (already configured in `nuxt.config.ts` `fonts`).

## Files
- `Stems How It Works.dc.html` — the HTML design reference (mobile + desktop side by side).
- `assets/hero-flowers.svg` — the floral wash image (already in the app at `public/hero-flowers.svg`).

Existing codebase file to update against this design: **`app/pages/how-it-works.vue`** (extend it with the new sections — phone preview and the orders & invoices block — keeping the existing copy and `default` layout). Reference `app/pages/@[handle]/` for the profile-preview content and `app/pages/invoices/` for the invoice card fields.
