# Handoff: Discover page redesign

## Overview
The **Discover** page is Stems' public entry point — where a florist finds a flower **grower**. Florists search primarily by **location** and **@username** (farm name also works). Most growers are reached via a **direct link** to their `/@handle` profile, so Discover is intentionally a calm, search-first utility page — not a heavily merchandised browse experience.

This handoff covers a **mobile** and **desktop** version, restyled to sit alongside the Stems landing page / brand system.

## About the design files
The file in this bundle (`Stems Discover.dc.html`) is a **design reference created in HTML** — a prototype showing the intended look and behaviour. It is **not** production code to copy directly.

This design maps onto an **existing Nuxt 3 + Vue 3 + Nuxt UI (Tailwind) codebase**. A `/discover` page already exists and is the brand's reference implementation. The task is to **bring that existing page up to this redesign** using the codebase's established patterns, components, and tokens — not to introduce new CSS or a parallel styling approach. Concretely:

- Page: `app/pages/discover.vue`
- Row component: `app/components/Grower/Card.vue`
- Tab bar: `app/components/App/TabBar.vue`
- Tokens: `app/assets/css/main.css` (`@theme static`) + `app/app.config.ts`
- Brand reference: `DESIGN.md`

## Fidelity
**High-fidelity.** Final colours, typography, spacing, and layout. Recreate pixel-faithfully using the existing Nuxt UI components and Stems tokens (the hex values below are the source tokens — prefer the semantic aliases like `text-muted`, `border-default`, `bg-primary` over raw hex).

---

## Screens / Views

### 1. Discover — Mobile (390 × 844)
Single scrolling column inside the signed-in `app` layout (bottom tab bar visible).

**Layout, top to bottom:**
1. **Branded floral header** — full-bleed, blurred hero-flowers image with a white gradient wash fading to solid white at the bottom. Centred text. Padding ~`pt-12 pb-6`, `px-6`.
   - Eyebrow: "Local · Seasonal · Grown" — Inter 600, 10px, `tracking-[0.3em]`, uppercase, `text-primary` (`#E87767`).
   - Wordmark: "Stems" — EB Garamond 500, ~46px, `leading-none`, `tracking-tight`, `text-default` (`#211E1A`).
   - Sub: "Find a local grower by name, handle or area" — Inter 400, 14px, `text-muted` (`#847B6E`), `max-w-[230px]`.
   - Utility nav: How it works · About · Blog · Policies — Inter 600, 10px, `tracking-[0.16em]`, uppercase, `text-muted`, dot separators in `text-dimmed`.
2. **Search field** (sticky in the live app) — white pill, `rounded-full`, `1px` `border-default` (`#E9E5DE`), `shadow-sm`, padding ~`14px 20px`. Lucide `search` icon `#A89F92`. Placeholder: **"Search name, @username or area"**, Inter 16px, `text-dimmed`.
3. **Section header** — "Growers near you" (Inter 600, 11px, `tracking-[0.18em]`, uppercase, `text-muted`) left; result count (Inter 13px, `tabular-nums`, `text-dimmed`) right. Becomes "Results" when searching.
4. **Grower feed** — borderless rows on `1px` `border-default` hairline dividers (see component below).
5. **Bottom tab bar** — fixed, `bg-white/94` + `backdrop-blur`, `1px` top border. Left: Discover (search icon, `text-primary`, active). Right: "Start selling" — solid `bg-primary` pill, white text, full-width-ish, `rounded-full`, soft peach shadow. (In the real app this is `App/TabBar.vue`; the second item is the logged-out "List your flowers" CTA — keep the existing auth gating.)

### 2. Discover — Desktop (centred, max-w ≈ 640px)
**Same column, same components** — Stems deliberately keeps a narrow centred content column on desktop rather than a wide multi-column grid. Differences from mobile only:
- Header full-bleed (image runs edge-to-edge, `mx-[calc(50%-50vw)] w-screen`), text constrained to the centred column. Wordmark ~60px; eyebrow 11px `tracking-[0.32em]`.
- Search pill padding ~`16px 24px`. Placeholder: "Search by name, @username or area".
- Rows slightly larger (avatar 56px, farm name 20px) with `rounded-xl` hover background and `px-2 -mx-2` insets.
- **Floating pill nav** instead of a bottom bar: centred, `bottom-30px`, `rounded-full`, `bg-white/96` + `backdrop-blur`, `1px` `border-default`, soft shadow. Holds "Discover" (ghost, `text-primary`) + "Start selling" (solid primary pill).

---

## Grower row component (`GrowerCard`)
Instagram-borrowed: borderless, avatar-led row; the **whole row links to `/@handle`**. Hairline divider drawn by the parent list (`divide-y divide-default`).

- **Avatar** — 54px (mobile) / 56px (desktop), `rounded-full`. Real photo (`object-cover`) if `avatarUrl`, else **warm tinted initials**: deterministic tint keyed off the handle (peach `#FCE8E3`/`#B6483B`, honey `#F6EBD6`/`#A9823A`, clay `#ECE8E2`/`#847B6E`), EB Garamond 500, 1–2 initials from the farm name. Use existing `avatarInitials` / `avatarTint` from `shared/utils/avatar`.
- **Farm name** — EB Garamond 500, 18/20px, `text-default`, truncate, → `text-primary` on row hover.
- **Subtitle** — "@handle  ·  Location" — Inter 400, 13/14px, `text-muted`, truncate (location omitted if unknown).
- **Meta line** — Inter 12/13px. If `flowerCount > 0`: `●` dot `bg-success` + "{n} in season" (`text-success` 500) + `·` + "updated {timeAgo}". Else "Just joined". `useTimeAgo` for the relative time.
- **Trailing** — Lucide `arrow-up-right`, `text-dimmed`, hidden until row hover (fades + nudges right).

---

## Interactions & behaviour
- **Search** — `v-model` on the input; debounce the API term ~250ms (`refDebounced`) while keeping the field snappy. Empty term → API returns the recently-active browse list ("Growers near you"). Non-empty → "Results". Clear (`x`) button appears when there's a value.
- **Row tap** — navigates to `/@{handle}`.
- **States:** loading → 6 borderless skeleton rows (avatar circle + 3 lines); empty-while-searching → search icon + "Nothing for "{q}" yet" (EB Garamond) + "Invite a grower" mailto button; empty browse → flower icon + "First blooms coming soon". Keep all three from the current page.
- **Auth gating** — page is **public** (no auth middleware), rendered under `layout: 'app'`. The "List your flowers / Start selling" CTA is logged-out-only and gated on `!session.isPending && !isAuthed` to avoid a flash for signed-in users on refresh.
- Hover transitions ~200ms.

## State management
- `q` (input) → `debouncedQ` → `useFetch('/api/search', { query: { q } })` returning `GrowerCardDto[]` (`server/api/search.get.ts`).
- Derived: `isLoading` (status pending), `isSearching` (trimmed q length), `hasResults`, `resultCount`.
- `authClient.useSession()` → `isAuthed`, `showSignedOutCta`.

## Design tokens
Source: `app/assets/css/main.css` (`@theme static`), aliased in `app/app.config.ts`. Prefer the semantic aliases in code.

- **Primary / peach:** `peach-100 #FCE8E3` (avatar tint / soft fill), `peach-500 #E87767` (`primary` — CTA, active nav, links, the "● in season" cue, focus ring), `peach-700 #B6483B` (text on light peach).
- **Neutral / clay:** page bg `#FFFFFF`; `clay-100 #F4F2ED` muted fill; `clay-200 #E9E5DE` (`border-default` hairlines); `clay-500 #847B6E` (`text-muted`); `clay-900 #211E1A` (`text-default` ink). `text-dimmed` ≈ `#A89F92`.
- **Semantic:** `success` = leaf (the in-season dot/label); sage/rose/terracotta for status only — never lead.
- **Type:** display = **EB Garamond** (`font-display`) — wordmark, farm names, headlines, empty-state titles. Body/UI = **Inter** — handles, locations, meta, labels, buttons, search.
- **Radius:** rows/insets `rounded-xl`; pills/avatars/buttons `rounded-full`.
- **Elevation:** content rows have **no shadow** (hairline dividers only). Chrome (search field, nav pill, tab bar) may use `shadow-sm` / a soft elevation — that is allowed; content cards are not.

### Brand guardrails (from `DESIGN.md` — do not reintroduce)
Pure-white page canvas (no cream/beige backgrounds); no shadowy/boxed content cards; the accent is **coral-peach, not orange**; no Fraunces or quirky display serifs; green is a quiet semantic colour only, never the lead accent.

## Assets
- `assets/hero-flowers.svg` — the blurred floral header image. In the live app this is served from `/hero-flowers.svg` (`public/`). Reuse the existing one.
- Icons: **Lucide** (`i-lucide-search`, `i-lucide-x`, `i-lucide-arrow-up-right`, `i-lucide-flower-2`) via Nuxt UI / Iconify.
- Fonts: EB Garamond + Inter (already configured in `nuxt.config.ts` `fonts`).

## Files
- `Stems Discover.dc.html` — the HTML design reference (mobile + desktop side by side).
- `assets/hero-flowers.svg` — header image.

Existing codebase files to update against this design: `app/pages/discover.vue`, `app/components/Grower/Card.vue`, `app/components/App/TabBar.vue`.
