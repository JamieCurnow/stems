# Handoff: Public Single Flower Listing Page (`/@handle/[flowerId]`) Redesign

## Overview
This is the redesign of the **public, logged-out single flower detail page** at `/@handle/{flowerId}` — the page a florist or flower buyer lands on to decide whether to buy a specific flower from a grower. It is reached from the grower's public listing page (`/@handle`) or directly from a shared link.

Its whole job is to answer a buyer's questions at a glance — *what is it, what does it look like, how much, how much is available, can I haggle, how do I get it* — and make **contacting the grower** the obvious next step. The redesign keeps the existing data and behaviour but sharpens the hierarchy: a large photo gallery, then name → availability → price, with a persistent Contact action.

It ships **mobile** and **desktop** layouts.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing the intended look and behaviour, not production code to copy verbatim. The task is to **recreate this design in the existing Stems codebase** (Nuxt 3 / Vue 3 `<script setup>` + Nuxt UI + the app's existing components and utils), following its established patterns.

This page **already exists** in the codebase at **`app/pages/@[handle]/[flowerId].vue`** — apply this redesign to that file. The data plumbing (shared `useFetch` payload with the grower page), SSR/SEO meta, back-navigation, the `FlowerGallery` component, availability/price/contact helpers, the Contact sheet, and the `app` layout are **already wired**. This is primarily a **layout/visual restyle** — do not change the API, DTOs, routing, or SEO logic.

## Fidelity
**High-fidelity.** Colours, typography, spacing, and interactions are final. Recreate pixel-perfectly using the codebase's existing components and design tokens (`app/assets/css`, components under `app/components/`). Where the design re-uses an existing pattern (gallery, availability text, price line, contact sheet), use the existing component/util rather than rebuilding.

> **Design-vs-model note.** The prototype hard-codes one example flower (Icelandic poppies, "Champagne Bubbles", peach/white/pale-yellow, £1.00/stem · £10.00/bunch, 40cm, 10/bunch, Good · 90 stems, open to offers, a grower note). In production **every field is data-driven** from the flower record and must render conditionally — see "Conditional rendering" below. The "3 crops of one photo" in the prototype is only standing in for a **multi-photo gallery**; real photos come from `flower.photoUrls`.

---

## Layouts

Two responsive layouts share the same content and data.

### Mobile (390 × 844 viewport)
A single scrolling column inside the `app` layout, with a **sticky top bar** and a **sticky bottom Contact bar**.

- **Top bar** (sticky, `height: 54px`): translucent white (`rgba(255,255,255,.86)`, `backdrop-filter: blur(12px)`), bottom hairline `#EDE9E2`. Left: a **back button** (chevron-left + grower farm name, truncated) that pops history back to the grower listing (existing `goBack()`). Right: a circular **Share** icon button (`38×38px`, icon `#847B6E`).
- **Scroll body** (between top bar and bottom bar), bottom padding **≈150px** so the last content clears the sticky Contact bar.
  1. **Gallery** — see "Gallery" below. `padding: 16px 18px 0`.
  2. **Details** — `padding: 20px 22px 150px`:
     - **Name** (`<h1>`): EB Garamond 500, `32px`, `line-height: 1.02`, `letter-spacing: -.01em`, `#211E1A`.
     - **Subtitle**: Inter 400, `15px`, `#847B6E`. `variety · color` (existing `subtitle` computed).
     - **Availability row** (`margin-top: 20px`): the label `Availability:` (`#847B6E`, `14px`) + a **status chip** and/or **stem count** — see "Availability" below.
     - **Price block** (`margin-top: 20px`, top hairline `#EDE9E2`, `padding-top: 20px`): price line, then **Open to offers** chip (conditional), then **fact chips**.
     - **Grower note** card (conditional).
     - **Seller card** (link to the grower's shop).
     - **Updated** line: Inter 400, `12px`, `#BBB2A4`.
- **Sticky bottom Contact bar**: `padding: 12px 18px 20px`, background fades to white (`linear-gradient(to top, #fff 68%, rgba(255,255,255,0))`). Full-width **Contact grower** pill — see "Actions".

### Desktop (card max-width 1200px)
A white card (`border-radius: 6px`, `box-shadow: 0 1px 4px rgba(0,0,0,.1)`) with a top bar and a **two-column product body**.

- **Top bar**: `padding: 18px 40px`, bottom hairline `#EDE9E2`. Left: back button (chevron + farm name). Right: **Discover** text link (search icon, `#847B6E`) + **Sign in** coral pill (`background: #FCE8E3`, text `#E87767`). These mirror the `app`-layout logged-out nav.
- **Product body**: `padding: 44px 40px 56px`, `display: grid; grid-template-columns: 560px 1fr; gap: 60px`.
  - **Left column — gallery**: main image `aspect-ratio: 1/1`, `border-radius: 22px`; thumbnail row beneath.
  - **Right column — details** (`max-width: 460px`): Name (EB Garamond 500, `46px`, `letter-spacing: -.015em`), subtitle (`17px`), availability row (`margin-top: 24px`), price block (`margin-top: 26px`, top hairline), grower note (conditional), **actions row**, an **Updated** line, then the **seller card**.

---

## Gallery
Use the existing **`FlowerGallery`** component (`app/components/Flower/…` — already used on this page and keyed by `flower.id`). The prototype shows the intended styling to match:

- **Main image**: `object-fit: cover`, background `#ECE8E2` while loading. Rounded (`24px` mobile / `22px` desktop). On mobile it's `aspect-ratio: 4/5`; desktop `1/1`.
- **Photo-count chip** (top-right): `background: rgba(28,26,23,.55)`, `backdrop-filter: blur(4px)`, white text, image icon, pill. Shows `{current} / {total}`.
- **Prev/next arrow buttons**: circular, `background: rgba(255,255,255,.82)`, `backdrop-filter: blur(4px)`, icon `#4A453E`, soft shadow. `34×34px` mobile / `40×40px` desktop. Hover → solid white.
- **Dots** (mobile, bottom-center): `7px` circles; active `#fff`, inactive `rgba(255,255,255,.5)`.
- **Thumbnail rail** (below the image): equal-width square buttons, `border-radius: 13px` (mobile) / `15px` (desktop), `object-fit: cover`. Active thumb: `2px solid #E87767` + full opacity; inactive: transparent border + `opacity: .72`.
- **Single-photo flowers**: hide arrows/dots/thumbnails and the count chip; show just the one image. **Photo-less flowers**: keep the existing gallery placeholder treatment.

> In the prototype the three thumbnails are crops of one image (via `object-position`) — a stand-in only. In production each thumbnail is a distinct `flower.photoUrls[i]`.

## Availability
Grower can set **either or both** of a categorical status (`availabilityStatus`) and an exact stem count (`stemsAvailable`). Render with the existing helpers in `shared/utils/flowers.ts` — **do not re-implement the string logic**. The design shows: an `Availability:` label, then a **status chip** and/or a **count**:

- **Status chip** (when `availabilityStatus` set): pill, `background: #EAF1E7`, text + dot `#5C7F5A` (green) for in-season; use the status's semantic colour for others (`availabilityStatusMeta().color` → warning/error/neutral/info). Inter 500, `13px` (mobile) / `14px` (desktop). Text = `availabilityStatusLabel()` (e.g. "Good", "Limited", "Very limited").
- **Stem count** (when `stemsAvailable != null && > 0`): plain text `#4A453E` 500, e.g. `90 stems` (use `stemsCountLabel()`). When shown alongside a status chip, prefix with a `·` separator (`· 90 stems`).
- The combined value should read like `availabilityText(f)` (`"Good · 90 stems"`, `"Good"`, `"90 stems"`, `"Available"`, or `"Sold out"`). **Never use the `≈` symbol.**
- **Sold out** (`isSoldOut(f)`): show a neutral "Sold out" chip and dim the count; keep the page viewable (buyers still contact to ask).

## Price
Built from the existing `priceLine` computed (`formatPence`/`bunchPrice` from `shared/utils/price.ts`). Prices are integer **pence** in the model — only format at render.

- **Price line**: `formatPence(pricePerStem)` `/ stem` · `formatPence(bunchPrice(f))` `/ bunch of {stemsPerBunch}`. Stem price is the emphasis: Inter 600, `30px` (mobile) / `40px` (desktop), `font-variant-numeric: tabular-nums`, `#211E1A`. The `/ stem` and bunch parts are muted `#847B6E`. Omit either side gracefully when its price is null.
- **Open to offers** chip (conditional on `flower.openToOffers`): sits **directly under the price line, above the fact chips**. `background: #EAF1E7`, text `#5C7F5A`, tag icon, Inter 500 pill.
- **Fact chips** (`margin-top: 15px`, wrap, `gap: 8px`): `background: #F5F2EC`, text `#4A453E`, Inter 500, `border-radius: 11px` (mobile) / `12px` (desktop). **No icons.** Render only the facts that exist:
  - `{stemLengthCm}cm stems` — only if `stemLengthCm != null`.
  - `{stemsPerBunch} per bunch` — only if `stemsPerBunch != null`.

## Grower note (conditional on `flower.notes`)
A soft card: `background: #F7F4EF`, `border: 1px solid #EDE9E2`, `border-radius: 16px`, `padding: 15px 17px` (mobile) / `17px 19px` (desktop).
- Eyebrow: `NOTE FROM THE GROWER` — Inter 600, `10px`, `letter-spacing: .16em`, uppercase, `#A89F92`, with a small file/note icon stroked amber `#C08A3E`.
- Body: `whitespace-pre-line` free text, Inter 400, `14px` (mobile) / `15px` (desktop), `line-height: 1.5`, `#4A453E`.

## Actions
- **Contact grower** (primary): coral pill, `background: #E87767`, white text, message icon, Inter 600, `border-radius: 999px`, subtle coral shadow (`0 10px 24px -12px rgba(232,119,103,.75)`). Hover `#e06a59`. Opens the existing **Contact sheet** (`ContactSheet` / `app/components/Contact/Sheet.vue`) — only render when `hasContact` (`contactOptions(profile).length > 0`).
  - **Mobile**: full-width, in the sticky bottom bar.
  - **Desktop**: in an actions row with a secondary **Save** heart icon button (`54px` wide, `border: 1px solid #E2DDD4`, icon `#847B6E`). *(Save is a new affordance shown in the design — wire it to existing save/bookmark behaviour if one exists, otherwise treat as optional / omit.)*
- **Share** (mobile top bar): `navigator.share` with copy-link fallback.

## Seller card
A link to the grower's public page (`/@{handle}`): `border: 1px solid #E9E5DE`, `border-radius: 16px`, `padding: 13px 15px`. Avatar (`44px` mobile / `48px` desktop, `border-radius: 50%`, `object-fit: cover` — photo-less → existing avatar-tint treatment), farm name (Inter 500, `#211E1A`), and a location line with a pin icon (`#847B6E`). Mobile: trailing chevron. Desktop: trailing `View shop ›`.

## Conditional rendering (important — everything is data-driven)
Render each block only when its data exists:
- subtitle → only if `variety` or `color` present.
- availability chip → only if `availabilityStatus`; count → only if `stemsAvailable > 0`.
- price sides → each only if that price is non-null.
- open-to-offers chip → only if `flower.openToOffers`.
- fact chips → each only if its field is non-null.
- grower note → only if `flower.notes`.
- gallery arrows/dots/thumbs/count → only if `photoUrls.length > 1`.
- Contact → only if `hasContact`.

## Interactions & Behavior
- **Back button** pops history so the grower list restores its scroll position; deep-links fall back to `/@{handle}` (existing `goBack()`). Keep this exactly.
- **Gallery** nav: arrows step prev/next (wrap), thumbnails jump, dots reflect the active index. Instant swap (no cross-fade needed).
- **Contact** opens the Contact sheet (deep links: WhatsApp/email/phone). No in-app messaging.
- **Share** → `navigator.share` + copy-link fallback.
- **Seller card / back / Discover / Sign in** navigate as labelled.
- Hit targets ≥ 44px. All pills/buttons carry the hover states above.
- Keep the existing **SSR + `useSeoMeta`** block untouched (title, OG image from `photoUrls[0]`, absolute URL). It matters for link previews.

## State Management
Reuse what `[flowerId].vue` already has, plus gallery-local UI state (already inside `FlowerGallery`):
- `profile`, `flowers` from the shared `useFetch('/api/public/{handle}')` (same key as the grower page → instant nav, SSR for deep-links).
- `flower = computed(...)` found by `flowerId`; 404 if missing/archived.
- `subtitle`, `meta`, `priceLine`, `hasContact`, `contactOpen` (existing).
- Gallery active-index lives in `FlowerGallery` (keyed by `flower.id` so it resets between flowers).

## Design Tokens
**Colors**
- Page background: `#ECE8E2` · Card/surface: `#FFFFFF`
- Ink (primary text): `#211E1A` · Body: `#4A453E` · Muted: `#847B6E` · Faint/meta: `#A89F92`, `#BBB2A4`
- Hairline border: `#EDE9E2`; icon-button / outline border: `#E2DDD4`, `#E9E5DE`
- Coral (accent / primary button): `#E87767`; hover `#e06a59`. Coral pill background (Sign in): `#FCE8E3`; hover `#fbded7`
- Green (in-season / offers text + dot): `#5C7F5A`; offers & status chip bg: `#EAF1E7`
- Fact-chip bg: `#F5F2EC`; grower-note bg: `#F7F4EF`; note icon: `#C08A3E`
- Image loading bg: `#ECE8E2`; gallery overlay chip: `rgba(28,26,23,.55)`

**Typography**
- Display/serif: **EB Garamond** 500 (flower name).
- UI/sans: **Inter** 400/500/600.
- Prices: `font-variant-numeric: tabular-nums`.
- Eyebrows/section labels: uppercase, `letter-spacing: .16em`.

**Radius**
- Pills/buttons: `999px` · Gallery main: `24px`/`22px` · Thumbnails: `13px`/`15px`
- Fact chips: `11px`/`12px` · Note & seller cards: `16px` · Desktop card: `6px` · Avatar: `50%`

**Shadows**
- Contact button: `0 10px 24px -10px rgba(232,119,103,.7)` (mobile) / `0 10px 24px -12px rgba(232,119,103,.75)` (desktop)
- Gallery arrows: `0 2px 8px rgba(33,30,26,.16)` (mobile) / `0 3px 10px rgba(33,30,26,.18)` (desktop)
- Desktop card: `0 1px 4px rgba(0,0,0,.1)`

## Data model (for reference — do not change)
From `shared/utils/flowers.ts` and the `FlowerDto`. Availability is two independent optional signals plus offers:
- `availabilityStatus`: one of `good | limited | very_limited | sold_out | midweek | next_week | soon` (or null). Labels/colours from `AVAILABILITY_STATUSES`.
- `stemsAvailable`: `number | null` (`0` = sold out, `null` = unspecified, `>0` = count).
- `openToOffers`: `boolean`.
- Plus `name`, `variety`, `color`, `stemLengthCm`, `stemsPerBunch`, `pricePerStem`, `pricePerBunch` (all pence, nullable), `notes`, `photoUrls[]`, `updatedAt`.
Helpers to reuse: `availabilityText`, `availabilityStatusLabel`, `availabilityStatusMeta`, `stemsCountLabel`, `isSoldOut`, `isInStock` (flowers.ts); `formatPence`, `bunchPrice` (price.ts); `contactOptions` (contact.ts); `timeAgo` (time.ts).

## Assets
`assets/` holds the photos used in the prototype (already in the codebase under `public/phoneMock/`; in production they come from the flower/profile records):
- `Icelandic-poppies.jpg` — the example flower (shown as the gallery, with 3 crops standing in for multiple photos).
- `profile.jpg` — grower avatar in the seller card.

Icons in the prototype are inline SVG (Lucide-style: chevron-left, chevron-left/right, share/network, image, tag, map-pin, message-circle, heart, file-text, search). Use the codebase's existing icon set (`i-lucide-*`) to match.

## Files
- **`Stems Single Listing.dc.html`** — the hi-fi design reference (open in a browser). Mobile and desktop layouts side by side. Tweak props used during design exploration: `availability` (`status` | `count` | `both`), `openToOffers` (bool), `showNotes` (bool) — these just toggle the prototype's example states; in production the equivalents are the flower's own fields.
- **Target file to modify:** `app/pages/@[handle]/[flowerId].vue` (existing page — apply this redesign there).
- **Reuse:** `app/components/Flower/FlowerGallery.vue`, `app/components/Contact/Sheet.vue`, `shared/utils/flowers.ts`, `shared/utils/price.ts`, `shared/utils/contact.ts`, `shared/utils/time.ts`, and the `app` layout.
