# Handoff: About page redesign

## Overview
The **About** page (`/about`) is a public marketing page. Its job is to give a visitor a feel for **why Stems exists** — the problem it solves and why the founders built it. This redesign rewrites the page in a **first-person founder voice** (Jamie & Juliette), leads with a **founder photo**, and restyles it to sit alongside the Stems landing / how-it-works pages and the brand system. It is **the why, not the how** — the step-by-step belongs on `/how-it-works`.

This handoff covers a **mobile** and a **desktop** version.

## About the design files
The file in this bundle (`Stems About.dc.html`) is a **design reference created in HTML** — a prototype showing the intended look and behaviour. It is **not** production code to copy directly.

This design maps onto the **existing Nuxt 3 + Vue 3 + Nuxt UI (Tailwind v4) codebase**. An `/about` page already exists (`app/pages/about.vue`, a plain text article) and is the page to **replace** with this redesign. The task is to recreate this design using the codebase's established patterns, components, and tokens — not to introduce new CSS or a parallel styling approach. Concretely:

- Page: `app/pages/about.vue` (currently a long text article on the `default` layout)
- Layout chrome: `default` layout (Stems wordmark + sign-in / nav) — keep it; don't rebuild the header/footer inside the page
- Tokens: `app/assets/css/main.css` (`@theme static`) + `app/app.config.ts`
- Brand reference: `DESIGN.md` and `marketing/00-foundations/brand-voice.md`
- Sibling page to mirror for section rhythm and the hero/CTA floral-wash treatment: `app/pages/how-it-works.vue`

## Fidelity
**High-fidelity.** Final colours, typography, spacing, and layout. Recreate pixel-faithfully using the existing Nuxt UI components and Stems tokens. The hex values below are the source tokens — **prefer the semantic aliases** (`text-muted`, `border-default`, `bg-primary`, `text-primary`, …) over raw hex.

> **Copy is placeholder-real.** The founder narrative (Cornwall half-acre, Juliette grows / Jamie builds software, the Sunday-night spreadsheet) is written to fit the brief and the brand voice, but the **specific facts are invented** — confirm the true story with Jamie & Juliette and swap details before shipping. The voice, structure, and length are the spec; the biographical particulars are not.

---

## Screens / Views

Both versions share the same content spine, top to bottom:

1. **Hero** (floral wash) — eyebrow "About", display headline "Why we made Stems", supporting paragraph introducing Jamie & Juliette, and the **founder photo**.
2. **Story** — two short chapters in first person: "It started with a buzzing phone" → "So we made the thing I wished I had".
3. **Pull quote** (peach band) — the one-line thesis.
4. **What we believe** — three short belief statements + a "— Jamie & Juliette" signature.
5. **Closing CTA** (floral wash) — "Got flowers to sell?" + two buttons + a "say hello" email line.
6. **Footer.**

### 1. About — Mobile (430px column)
Single scrolling column. A slim header (Stems wordmark left, "List your flowers" pill right) sits above the hero — in the real app this is the `default` layout chrome, so don't rebuild it inside the page.

- **Hero** — centred. Full-bleed blurred `hero-flowers.svg` background with a white gradient wash fading to solid white at the bottom (`scale(1.18)`, `blur(24px)`). Eyebrow "About" (Inter 600, 11px, `tracking-[0.32em]`, uppercase, `text-primary`). Headline "Why we made Stems" (EB Garamond 500, ~40px, `leading-[1.04]`, `text-default`). Sub paragraph (Inter 400, 15px, `text-muted`, `max-w-[300px]`).
- **Founder photo** — full-width below the hero copy, on white: a `rounded-2xl` (16px) image **~300px tall**, `object-cover`. Caption beneath in `text-dimmed` 12px, centred ("Jamie & Juliette · the half-acre in Cornwall where it began"). See **Founder photo** component note below.
- **Story** — white. Two `h2` chapter headings (EB Garamond 500, 24px) each followed by two paragraphs (Inter 400, 15px, `leading-[1.62]`, `text-[#4A453E]` — between `text-default` ink and `text-muted`; use the body ink). No cards, no dividers — just typographic rhythm with generous top margins (~34px) between chapters.
- **Pull quote** — `peach-50`/`#FEF5F3` band, centred. The quote in EB Garamond 500, 23px, `leading-[1.3]`, `max-w-[320px]`. Curly quotes.
- **What we believe** — white. Eyebrow "What we believe" (`text-primary`, uppercase, `tracking-[0.3em]`). Three rows on hairline dividers (`divide-y divide-default` / `border-top`), each a two-column flex: a fixed ~118px small-caps label (`text-primary`, 11px, `tracking-[0.16em]`, uppercase) + a body paragraph (Inter 400, 14px, `text-[#4A453E]`). Closes with a right-aligned italic EB Garamond signature "— Jamie & Juliette" (`text-muted`).
- **CTA** — a `#FEF5F3` rounded panel (`rounded-[18px]`) with headline "Got flowers to sell?" (EB Garamond 500, 26px), paragraph, two stacked full-width pill buttons ("List your flowers" solid primary; "Find a grower near you" white + `border-default`), and a small `text-dimmed` "say hello — hello@stems.market" line.
- **Footer** — centred wordmark, "Local · Seasonal · Grown" eyebrow, nav row (How it works / **About** active / Blog / Policies).

### 2. About — Desktop (1280px frame, content `max-w` ≈ 1120px, `px-14`)
Same spine, widened. Differences from mobile:

- **Hero** is **two-column** inside the floral-wash band, with the **full nav bar** above (wordmark + How it works / About / Blog / Policies + a hairline divider + Sign in + "List your flowers" pill). Left column: eyebrow "About", headline "Why we made Stems" (EB Garamond ~58px, `tracking-[-0.015em]`), paragraph (Inter 18px, `text-muted`, `max-w-[440px]`). Right column: the **founder photo**, 430px wide × 480px tall, `rounded-[20px]`, with a soft drop shadow (`0 26px 60px -28px rgba(33,30,26,.45)`) — this is **chrome/media**, so a shadow is allowed here, unlike content cards. Caption beneath, centred.
- **Story** is a **centred narrow column** (`max-w-[720px]`), body paragraphs at 18px / `leading-[1.7]`, chapter gaps ~48px.
- **Pull quote** band — `#FEF5F3`, centred, quote at EB Garamond ~38px / `leading-[1.28]`, `max-w-[760px]`.
- **What we believe** is a **3-up grid** (`grid-cols-3`, gap ~48px) on white, with a centred section header above (eyebrow + "A few things we're sure about", EB Garamond ~38px). Each cell: a small-caps `text-primary` label + a 16px body paragraph. Centred italic signature below.
- **Closing CTA** — full floral-wash band (`hero-flowers.svg` anchored bottom, same white overlay), centred headline (~44px), paragraph, two pill buttons side by side, and the "say hello" line.
- **Footer** — wordmark + "Local · Seasonal · Grown" tagline left, nav right.

---

## Founder photo component
The single hero image of Jamie & Juliette.

- **In the prototype** it is an `<image-slot>` placeholder (a drag-and-drop target) so the design can be filled with a real photo — this is a **prototyping device only**. In the app, render a plain `<NuxtImg>` / `<img>` with the real founders' photo.
- Mobile: full-width, ~300px tall, `rounded-2xl` (16px), `object-cover`, no shadow.
- Desktop: 430 × 480px, `rounded-[20px]`, `object-cover`, soft shadow (`0 26px 60px -28px rgba(33,30,26,.45)`).
- Source the asset through the existing **image pipeline** (`roadmap/06-image-pipeline.md`) or `public/`. Provide meaningful `alt` ("Jamie and Juliette in their cutting garden").
- Caption is a separate `text-dimmed` line beneath, not overlaid.

---

## Interactions & behaviour
This is a **static marketing page** — no data fetching, no app state. Behaviour is limited to:

- **CTA navigation:** "List your flowers" → `/login` (existing). "Find a grower near you" → `/discover`. "say hello" link → `mailto:hello@stems.market`. Nav + footer links → `/how-it-works`, `/about`, `/blog`, `/policies`. The **About** nav item shows the active/`text-primary` state on this page.
- **Hover:** buttons and links ~200ms transitions, matching existing `UButton` behaviour. Text links → `text-primary` / slight opacity on hover.
- **Responsive:** the two layouts in the file are the **mobile** and **desktop** ends of one responsive page — collapse the desktop two-column hero (photo drops below the copy) and the 3-up beliefs grid to the single stacked column at the `sm`/`md` breakpoint. Use the codebase's existing breakpoints.
- The founder photo is **presentational**; no lightbox or interactivity needed.

## State management
None. Public page on the `default` layout, no auth, no API calls. Keep `definePageMeta({ layout: 'default' })` and `useSeoMeta(...)` from the existing `about.vue` (the existing SEO title/description still fit; tweak if the new copy warrants).

## Design tokens
Source: `app/assets/css/main.css` (`@theme static`), aliased in `app/app.config.ts`. Prefer the semantic aliases in code.

- **Primary / peach:** `peach-50 #FEF5F3` (pull-quote band, CTA panel, soft wash), `peach-100 #FCE8E3` (soft fills), `peach-500 #E87767` (`primary` — CTAs, eyebrows, active nav, links, belief labels), `peach-700 #B6483B` (text on light peach).
- **Neutral / clay:** page bg `#FFFFFF`; `clay-200 #E9E5DE` (`border-default` hairlines; warmer `#EFEBE4`/`#EFE7E2` also used), `clay-500 #847B6E` (`text-muted` — sub-paragraphs, captions, signature), `clay-900 #211E1A` (`text-default` ink — headlines, quote). Body prose uses a slightly warmer ink `#4A453E` (between ink and muted); `text-dimmed` ≈ `#A89F92` for captions / the email line; `#C9A99E` only if any numerals appear.
- **Type:** display = **EB Garamond** (`font-display`) — wordmark, hero/section headlines, chapter `h2`s, the pull quote, the italic signature, the CTA headline. Body/UI = **Inter** — paragraphs, eyebrows, belief labels, buttons, captions.
- **Radius:** founder photo `rounded-2xl` / `rounded-[20px]`; CTA panel `rounded-[18px]`; pills/buttons `rounded-full`.
- **Elevation:** content reads on hairline dividers and typographic rhythm — **no boxed/shadowed content cards** (per `DESIGN.md`). The only shadow is on the **founder photo** (media/chrome) and the small shadow under the header "List your flowers" pill.
- **Spacing:** desktop sections ~`py-[80–92px]`, content `max-w-[1120px]` (story column `max-w-[720px]`), `px-14`. Mobile sections ~`py-[40px]`, `px-7`.

### Brand guardrails (from `DESIGN.md` / `brand-voice.md` — do not reintroduce)
Pure-white page canvas (the peach wash bands are fine; no cream/beige page background); no shadowy/boxed content cards; the accent is **coral-peach, not orange**; no Fraunces or quirky display serifs; green is a quiet semantic colour only, never used here; **no em-dashes** and **UK spelling** in copy; warm, calm, honest, no lecturing — speaks to the grower first.

## Assets
- `assets/hero-flowers.svg` — the blurred floral wash used in the hero and closing CTA. In the live app this is served from `/hero-flowers.svg` (`public/hero-flowers.svg`) — **reuse the existing one**, don't ship a copy.
- **Founder photo** — a real photograph of Jamie & Juliette is required (not in this bundle). Source it through the existing image pipeline / `public/`.
- `image-slot.js` — a prototyping helper that powers the drag-and-drop photo placeholder in the HTML reference **only**. Do **not** port it; replace the slot with a real `<img>`/`<NuxtImg>`.
- Fonts: EB Garamond + Inter (already configured in `nuxt.config.ts` `fonts`).

## Files
- `Stems About.dc.html` — the HTML design reference (mobile + desktop side by side).
- `assets/hero-flowers.svg` — the floral wash image (already in the app at `public/hero-flowers.svg`).
- `image-slot.js` — prototype-only image placeholder helper (not for production).

Existing codebase file to replace against this design: **`app/pages/about.vue`** (swap the long text article for this founder-voice redesign, keeping the `default` layout and `useSeoMeta`). Reference `app/pages/how-it-works.vue` for the shared hero/CTA floral-wash treatment and section rhythm.
