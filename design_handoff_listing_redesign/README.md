# Handoff: Public Flower Listing Page (`/@handle`) Redesign

## Overview
This is the redesign of the **public, logged-out grower page** at `/@handle` — the shareable "wedge" a flower grower links to from their Instagram bio, WhatsApp, etc. It is the primary value page of the app: a buyer arrives here from a social link with one intent — **see the flowers and contact the grower to buy them**.

The redesign keeps the existing information architecture but tightens the hierarchy so those two actions dominate. It ships **mobile** and **desktop** layouts, and the flower feed has **two view modes** — a detail-dense **List** and a photo-forward **Grid** — that the buyer switches between with a segmented control in the Availability header (default Grid).

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing the intended look and behaviour, not production code to copy verbatim. The task is to **recreate this design in the existing Stems codebase** (Nuxt 3 / Vue 3 `<script setup>` + the app's existing components and utils), following its established patterns.

This page already exists in the codebase at **`app/pages/@[handle]/index.vue`** — this redesign should be applied to that file. The data plumbing, SSR/SEO, avatar tint, availability helpers, contact sheet and `app` layout (floating bottom nav) are already wired; **this is primarily a layout/visual restyle**, not new data work. Do not change the API, DTOs, or routing.

## Fidelity
**High-fidelity.** Colours, typography, spacing, and interactions are final. Recreate pixel-perfectly using the codebase's existing components and design tokens (see `app/assets/css` and the components under `app/components/`). Where the design re-uses an existing pattern (avatar tint, availability text, contact sheet, bottom nav), use the existing component/util rather than rebuilding.

## Layouts

Two responsive layouts share the same content and data. Single centered content column on both; the page differs only in chrome and scale.

### Shared structure (top → bottom)
1. **Floral hero banner** — full-bleed photo, fading to white.
2. **Profile block** (overlapping the banner) — avatar, eyebrow, farm name, handle · location.
3. **Bio line.**
4. **Action row** — primary Contact + secondary Instagram/Share icon buttons.
5. **Availability section header** — label + "● N in season · Updated X ago" sub-line, plus a **List / Grid view switcher** on the right.
6. **Availability feed** — renders in one of **two view modes** (see below), toggled by the switcher.
7. **Floating bottom nav** (from the `app` layout) — Discover + Sign in.

### Two view modes (the key interaction)
The feed can be shown as either a **List** (detail-dense) or a **Grid** (photo-forward gallery). A segmented control in the Availability header switches between them; the choice is view-local UI state (default **Grid**). Both modes render the same flowers from the same data.

- **List mode** — a borderless vertical list. Each row: small portrait thumbnail + name, variety subtitle, availability, price, "open to offers" chip, grower note, and per-flower "updated". Best for buyers who want the full detail at a glance. (This is the "Flower Row" spec below.)
- **Grid mode** — a 2-up (mobile) / 3-up (desktop) gallery of large square-ish tiles. Because most growers only photograph a few of their flowers, **photo-less flowers get a warm, deterministic colour tile** (same tint language as the app's avatar fallbacks) with a flower glyph — so a mixed grid still reads as intentional, not broken. Availability shows as a frosted status chip on the image corner; name/variety/price sit below. (See "Grid tile" spec below.)

The **switcher** is a pill-shaped segmented control: `background: #F1EEE8`, `border-radius: 999px`, `padding: 3px`, holding two `36×30px` icon buttons (list-rows icon, 2×2-grid icon). The **active** button is `background: #fff` + `box-shadow: 0 1px 3px rgba(33,30,26,.18)` with icon colour `#211E1A`; the **inactive** button is transparent with icon `#A89F92`. The highlight must track the selected mode.

---

### Mobile (390 × 844 viewport)

- **Hero:** banner image `height: 230px`, `object-fit: cover`, absolutely positioned at top. A gradient overlay sits above it: `linear-gradient(to bottom, rgba(255,255,255,.1) 0%, rgba(255,255,255,.55) 34%, #fff 58%)`, `height: 270px`. The banner must fade **fully to white** before the profile eyebrow — no image showing behind the text.
- **Profile block:** centered, `padding: 120px 26px 6px` (the top padding pushes content below the banner image).
  - Avatar: `92×92px`, `border-radius: 50%`, `object-fit: cover`, `outline: 4px solid #fff`, `box-shadow: 0 6px 18px -8px rgba(33,30,26,.4)`. Photo-less growers use the existing **avatar tint + serif initials** treatment (`avatarTint`/`avatarInitials`).
  - Eyebrow: `Florist & Gardener` — Inter 600, `10px`, `letter-spacing: .26em`, uppercase, color `#E87767`. (This is the grower's tagline/role; from profile data.)
  - Farm name (`<h1>`): EB Garamond 500, `31px`, `line-height: 1.05`, `letter-spacing: -.01em`, color `#211E1A`.
  - Meta line: Inter 400, `14px`, color `#847B6E`. Format: `@handle` (color `#A89F92`) · location with a pin icon. Middot separator color `#D8D2C8`.
- **Bio:** centered, Inter 400, `15px`, `line-height: 1.5`, color `#4A453E`, `max-width: 30ch`.
- **Action row:** flex row, centered, `gap: 10px`, `margin-top: 20px`.
  - **Contact** (primary): pill, `background: #FCE8E3`, text color `#E87767`, Inter 500 `15px`, `padding: 14px 28px`, `border-radius: 999px`, message icon, **no shadow**. Hover `background: #fbded7`. (Matches the "Sign in" pill in the bottom nav exactly.)
  - **Instagram** + **Share** (secondary): `46×46px` circular icon buttons, `border: 1px solid #E2DDD4`, icon color `#847B6E`, transparent background. Hover `background: rgba(33,30,26,.035)`. These are low-priority — kept small and quiet on purpose.
- **Availability header:** flex row, `space-between`, `padding: 22px 24px 6px`.
  - Left: `AVAILABILITY` label (Inter 600, `11px`, `letter-spacing: .18em`, uppercase, `#847B6E`) with a sub-line beneath it (Inter 400, `11px`): a `6px` green dot + `● N in season` (`#5C7F5A`, weight 500) + `· Updated X ago` (`#A89F92`). The in-season count and "Updated" timestamp live **here**, next to the list they describe — not up by the profile.
  - Right: the **List / Grid switcher** (spec above).
- **List-mode feed:** `padding: 0 24px 60px`. Each row (see Flower Row below) thumbnail `74×92px`, `border-radius: 10px`.
- **Grid-mode feed:** `display: grid`, `grid-template-columns: 1fr 1fr` (2-up), `gap: 18px 12px`, `padding: 2px 18px 90px`. Cards must set `min-width: 0` so the columns halve cleanly. Tile spec under "Grid tile" below; name `17px`, subtitle `12px`, price `13px`.
- **Bottom nav:** floating pill, horizontally centered, `bottom: 26px`. `background: rgba(255,255,255,.94)`, `backdrop-filter: blur(12px)`, `border: 1px solid #E9E5DE`, `border-radius: 999px`, `box-shadow: 0 10px 30px -10px rgba(33,30,26,.28)`, `padding: 7px 8px`. Contains **Discover** (text `#847B6E`, search icon) and **Sign in** (pill, `background: #FCE8E3`, text `#E87767`, login icon). This is the existing `app` layout nav — reuse it.

### Desktop (card max-width 1120px, content column max-width 640px)

Same content, scaled up; content stays in a centered `max-width: 640px` column.

- **Hero:** banner `height: 320px`; gradient overlay `height: 420px`, `linear-gradient(to bottom, rgba(255,255,255,.08) 0%, rgba(255,255,255,.5) 32%, #fff 56%)`.
- **Profile:** `padding: 150px 24px 4px`. Avatar `120×120px`, `outline: 5px solid #fff`. Eyebrow `11px`/`letter-spacing: .3em`. Farm name `44px`. Meta line `16px`.
- **Bio:** `16px`, `line-height: 1.55`, `max-width: 46ch`.
- **Action row:** `gap: 11px`. Contact pill `padding: 15px 32px`, `16px`. Icon buttons `50×50px`.
- **Availability header:** `padding: 34px 2px 6px`; same structure — label + green in-season/updated sub-line on the left, List/Grid switcher on the right. Slightly larger type.
- **List-mode feed:** thumbnail `88×110px`, `border-radius: 12px`, row `padding: 18px 10px`, with a faint `↗` arrow icon (`#CFC8BC`) at the right of each row. Rows have a hover background `rgba(33,30,26,.016)`.
- **Grid-mode feed:** `display: grid`, `grid-template-columns: repeat(3, 1fr)` (3-up), `gap: 28px 20px`, cards `min-width: 0`. Name `19px`, subtitle `12px`; price + "open to offers" chip sit in a `flex-wrap` row beneath. (The standalone `Stems Listing - Gallery.dc.html` reference explores a wider 3-up in a `960px` column; within this page's `640px` column, 3-up tiles are ~184px.)
- **Bottom nav:** floating pill, `bottom: 30px`, same treatment as mobile.

---

### Flower Row (the core repeated unit)
Borderless feed item (Toast × Instagram language). Bottom border `1px solid #EDE9E2` only.

- **Thumbnail** (left, fixed): the flower's photo (`object-fit: cover`, background `#ECE8E2` while loading). If the flower has **no photo**, render a placeholder: rounded rect `background: #F1EEE8` containing a small flower-cluster icon stroked in `#CFC8BC`.
- **Body** (flex: 1, min-width: 0):
  - Name (`<h3>`): EB Garamond 500 (`19px` mobile / `22px` desktop), `#211E1A`.
  - Subtitle: Inter 400 (`13/14px`), `#847B6E`, single line, ellipsis. Built from `variety · color · {stem}cm` (use existing `subtitleFor`).
  - Availability line: `Availability: <strong>{text}</strong>` — label `#847B6E`, value `#211E1A` 600. Use existing `availabilityText(f)` (e.g. "Good", "Limited", "Very limited · 5 stems", "Available").
  - Price line: Inter 400, `#847B6E`, `font-variant-numeric: tabular-nums`. Built from `{price}/stem · {price}/bunch` (use existing `priceLineFor` / `formatPence` / `bunchPrice`).
  - **Open to offers** chip (conditional): `background: #EAF1E7`, text `#5C7F5A`, Inter 500 `11/12px`, pill.
  - **Grower note** (conditional): italic Inter `13/14px`, color `#A89F92`, with a small note/file icon. Free-text from the grower.
  - Updated line: Inter 400, `11/12px`, color `#BBB2A4` — per-flower "Updated X ago".

### Grid tile (grid mode's repeated unit)
A vertical card: image on top, text below. `min-width: 0` on the card.
- **Media** (top): `width: 100%`, `aspect-ratio: 1 / 1.15`, `border-radius: 14px`, `overflow: hidden`.
  - If the flower **has a photo**: `object-fit: cover`, background `#ECE8E2` while loading.
  - If **no photo**: fill with a deterministic warm tint (hash the flower name → pick from a fixed palette of ~6 bg/ink pairs, same family as the avatar tints) and center a large flower-cluster glyph stroked in that tint's ink colour at `~0.7` opacity. This is what keeps a sparse grid looking intentional.
  - **Status chip** overlaid top-left: `background: rgba(255,255,255,.92)`, `backdrop-filter: blur(4px)`, `border-radius: 999px`, `padding: 4px 9px`, Inter 500 `11px`, `#4A453E`, with a `6px` status dot — green `#5C7F5A` for in-season, amber `#C08A3E` for limited. Shows the short availability word (e.g. "Good", "Limited", "Available").
- **Below the image:** flower name (EB Garamond 500), variety subtitle (Inter `12px`, `#A89F92`, single-line ellipsis), then price (Inter 500, `#211E1A`, tabular-nums) and the "open to offers" chip. Grid mode intentionally omits the grower note and per-flower "updated" — those live in list mode and on the flower detail.

## Interactions & Behavior
- **List / Grid switcher** toggles the feed between the two view modes. Store the choice as component state (a `ref<'list' | 'grid'>`), default `'grid'`; optionally persist to `localStorage` so a returning buyer keeps their preference. Both toggle instances (there is only one per breakpoint) must reflect the active mode in their highlight — drive the active pill from the reactive state, not a one-time computed value.
- **Contact** opens the existing **Contact sheet** (`app/components/Contact/Sheet.vue`) — a bottom sheet of deep links (WhatsApp/email/phone/etc.). Only render Contact when `contactOptions(profile).length > 0` (existing `hasContact`).
- **Instagram** links to `https://instagram.com/{handle}` (existing `instagramUrl`); render only if the grower set one.
- **Share** triggers the native share sheet (`navigator.share`) with a copy-link fallback.
- **Discover / Sign in** are the existing `app`-layout bottom-nav actions for the logged-out state — no change.
- Each flower row is a link/tap target into that flower's detail (keep existing behaviour if present).
- All pills/buttons have the hover states noted above. Hit targets ≥ 44px.
- Sold-out flowers: keep existing `isSoldOut(f)` treatment; `inSeasonCount` = flowers not sold out.

## State Management
Reuse what `index.vue` already has, plus one small addition for the view toggle:
- `profile`, `flowers` from `useFetch('/api/public/{handle}')` (SSR).
- `contactOpen` ref for the Contact sheet.
- Computed `inSeasonCount`, `lastUpdated` / `updatedAgo`, `instagramUrl`, `hasContact`.
- **New:** `view = ref<'list' | 'grid'>('grid')` for the feed view mode (optionally hydrated from `localStorage`).

## Design Tokens
**Colors**
- Page background: `#ECE8E2`
- Card / surface: `#FFFFFF`
- Ink (primary text): `#211E1A`
- Body text: `#4A453E`
- Muted text: `#847B6E`
- Faint text / meta: `#A89F92`, `#BBB2A4`
- Hairline border: `#EDE9E2`; icon-button border `#E2DDD4`
- Coral (accent text / eyebrow): `#E87767`
- Coral pill background: `#FCE8E3`; hover `#fbded7`
- Green (in-season / offers text): `#5C7F5A`; offers chip bg `#EAF1E7`
- Photo placeholder bg `#F1EEE8`; placeholder icon `#CFC8BC`
- Image loading bg: `#ECE8E2`

**Typography**
- Display/serif: **EB Garamond** (farm name, flower names) — weight 500.
- UI/sans: **Inter** — 400/500/600.
- Eyebrows: uppercase, letter-spacing `.26em` (mobile) / `.3em` (desktop).
- Section labels: uppercase, letter-spacing `.18em`.

**Radius**
- Pills/buttons: `999px`
- Thumbnails (list): `10px` (mobile) / `12px` (desktop)
- Grid tiles: `14px`
- Avatar: `50%`

**Grid tint palette (photo-less tiles)** — deterministic by flower name; bg / ink pairs:
`#EFE6DA`/`#A9874F`, `#E7EBDF`/`#6E7B58`, `#F3E4DD`/`#B5715E`, `#E4E8EC`/`#67788A`, `#EFE4EB`/`#8E6E86`, `#F1E9D6`/`#9C8444`. Grid status chip amber (limited): `#C08A3E`. Switcher track: `#F1EEE8`; active pill `#fff`.

**Shadows**
- Avatar (mobile): `0 6px 18px -8px rgba(33,30,26,.4)`
- Avatar (desktop): `0 8px 24px -10px rgba(33,30,26,.45)`
- Bottom nav: `0 10px 30px -10px rgba(33,30,26,.28)`
- Contact button: **none** (intentionally flat).

## Assets
The `assets/` folder contains the real photos used in the prototype. These already exist in the codebase under **`public/phoneMock/`** — reuse those at runtime; in production the banner/profile/flower photos come from the grower's profile and flower records (DTO `/img` paths resolved to absolute URLs for OG).
- `banner.jpg` — hero banner
- `profile.jpg` — grower avatar
- `Cornflower.jpg`, `Cosmos.jpg`, `Icelandic-poppies.jpg`, `Phlox.jpg`, `Sweet-peas.jpg` — sample flower photos

Icons in the prototype are inline SVG (Lucide-style: message, instagram, share/network, map-pin, clock, search, login, flower-cluster, note, arrow-up-right). Use the codebase's existing icon set to match these.

## Files
- **`Stems Listing.dc.html`** — the hi-fi design reference (open in a browser). Contains both mobile and desktop layouts side by side, each with the **List / Grid switcher** working. Tweak props on the reference: `defaultView` (`list`|`grid`), `showNotes`, `showPrices` (used during design exploration).
- **Target file to modify:** `app/pages/@[handle]/index.vue` (existing page — apply this redesign there).
- **Reuse:** `app/components/Contact/Sheet.vue`, `shared/utils/flowers.ts` (`availabilityText`, `isSoldOut`), `shared/utils/avatar.ts` (tint helper — reuse for the grid's photo-less tiles), `shared/utils/price.ts`, `shared/utils/contact.ts`, `shared/utils/time.ts`, and the `app` layout's floating bottom nav.
