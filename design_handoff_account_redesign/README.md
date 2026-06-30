# Handoff: Account page redesign (`/account`)

## Overview
The **Account** page (`/account`) is the signed-in grower's **identity home** — their avatar, name, handle, location and bio, plus the entry points into their grower tools (**My Flowers**, **Invoices**) and profile actions (**Edit profile**, **Share my page**, **Sign out**). This redesign restyles the existing page to sit cleanly alongside the rest of the Stems app and the brand system, and — at the user's request — moves the **bottom navigation to a floating pill on mobile**, matching the floating-pill treatment the tab bar already uses on desktop.

This handoff covers a **mobile** and a **desktop** version.

## About the design files
The file in this bundle (`Stems Account.dc.html`) is a **design reference created in HTML** — a prototype showing the intended look and behaviour. It is **not** production code to copy directly. It renders the mobile version inside a phone bezel and the desktop version in a window frame, side by side; the bezel/frame are presentation scaffolding, not part of the UI.

This design maps onto the **existing Nuxt 3 + Vue 3 + Nuxt UI (Tailwind v4) codebase**. The page and its navigation already exist — the task is to **update them in place** using the codebase's established patterns, components and tokens, not to introduce new CSS or a parallel styling approach. Concretely:

- **Page to update:** `app/pages/account/index.vue` (already on the `app` layout, gated by `auth` + `onboarding` middleware, reads `useProfile()`). The data wiring, computed avatar/initials, `startGrowing`, and `handleSignOut` are all correct — **keep them**; this is a visual/layout refresh of the template plus the nav change.
- **Navigation to update:** `app/components/App/TabBar.vue` — extend its existing desktop floating-pill style to mobile (see **Floating nav** below). This is the one structural change.
- **Layout chrome:** `app/layouts/app.vue` (scrollable content column + `<AppTabBar>`). Keep it; the nav lives in the layout via the tab bar component.
- **Tokens:** `app/assets/css/main.css` (`@theme static`) + `app/app.config.ts`.
- **Brand reference:** `DESIGN.md`.
- **Spec for the nav:** `roadmap/03-app-shell-navigation.md` (tab list, grower gating, safe-area rules).

## Fidelity
**High-fidelity.** Final colours, typography, spacing and layout. Recreate pixel-faithfully using the existing Nuxt UI components and Stems tokens. The hex values below are the source tokens — **prefer the semantic aliases** (`text-muted`, `border-default`, `text-primary`, `bg-elevated`, the `soft` button variants, …) over raw hex.

> **Copy is placeholder-real.** "Jamie Bloom / @jamie1 / Cornwall" and the Cornwall half-acre bio are sample data to populate the design — the real values come from the grower's `profile` row. Don't hard-code them.

---

## Screens / Views

Both versions share the same content spine, top to bottom:

1. **Identity** — avatar + name + verified tick, handle, location, bio, "View public page" link.
2. **Grower tool rows** — **My Flowers** and **Invoices**, each a hairline-bounded row with a soft peach **Open** pill.
3. **Profile actions** — **Edit profile** and **Share my page** (outline pills).
4. **Sign out** — quiet ghost link.
5. **Floating pill nav** — Discover · My Flowers · Profile (active) · Add, floating above the content.

### 1. Account — Mobile (390px screen, content `px-6` ≈ 24px)
Single scrolling column on a **white** page (`max-w-md` centred, as today).

- **Top bar** — a slim row above the scroll content: small-caps "PROFILE" eyebrow left (Inter 600, 11px, `tracking-[0.2em]`, uppercase, `text-muted`), and a 38px circular hairline **settings** icon button right (`i-lucide-settings`, `border-default`). A white→transparent gradient fades it into the scrolling content beneath. *(Optional polish — the page works without it; if omitted, keep the existing untitled top.)*
- **Identity** — avatar 84px left, details right. Avatar is either the grower's photo (`rounded-full object-cover`) **or**, photo-less, the warm-tint serif-initials circle that already exists (`tint` + `font-display`, e.g. peach `#FCE8E3` bg / `#B6483B` text "JB"). Name in EB Garamond 500, ~30px, `text-default`, truncating; an optional coral **verified tick** (`i-lucide-badge-check` or the filled seal in the mock, `text-primary`, ~19px) sits inline after it. Handle `@jamie1` (Inter 15px, `text-dimmed`). Location row: `i-lucide-map-pin` 14px + name (Inter 14px, `text-muted`).
- **Bio** — Inter 15px / `leading-[1.5]`, `text-[#4A453E]` (warm body ink), `max-w-[34ch]`, `whitespace-pre-line`. Photo-less / bio-less fallbacks: keep today's italic "Tell florists about your flowers…" muted prompt.
- **View public page** — coral text link (Inter 500, 15px, `text-primary`) with a trailing `i-lucide-arrow-up-right` that nudges on hover (as today). Links to `/@{handle}`.
- **Hairline divider** (`border-default`).
- **Grower rows** — **My Flowers** then **Invoices**. Each: heading EB Garamond 500, 21px, `text-default`; sub-line Inter 13px, `text-muted`; right-aligned **Open** pill = `UButton color="primary" variant="soft"` with trailing `i-lucide-arrow-right` (soft peach fill `#FCE8E3` / `#B6483B` text). Rows separated by hairlines (`border-y` / `border-b border-default`, ~18px vertical padding). **Grower gating unchanged:** non-growers see the existing **Start growing** row (flips `isGrower` via the existing `startGrowing`) instead of My Flowers, and the **Invoices** row is hidden for non-growers.
- **Profile actions** — two stacked full-width outline pills, ~11px gap: **Edit profile** (`i-lucide-pencil`, → `/account/edit`) and **Share my page** (the existing `ShareButton`). Both `UButton block size="lg" color="neutral" variant="outline"`, `rounded-full`.
- **Sign out** — quiet full-width ghost link (`i-lucide-log-out`, `text-muted` → `text-default` on hover), wired to the existing `handleSignOut` with its `signingOut` loading state.

### 2. Account — Desktop (content column `max-w-[680px]`, centred, `px-6`, generous top padding)
Same spine and same components, widened — **not** a different layout. Content stays in a centred reading column on white (it should look intentional on a wide viewport, per the shell spec). Differences from mobile:

- **Identity** avatar 108px; name EB Garamond ~40px; handle + location sit on **one row** separated by a gap (rather than stacked); bio `max-w-[46ch]`, Inter 16px / `leading-[1.55]`. Verified tick ~24px.
- **Grower rows** headings EB Garamond 24px, sub-lines Inter 15px, **Open** pills slightly larger; same soft-peach treatment and hairlines, ~22px vertical padding.
- **Profile actions** sit **side by side** (two equal `flex-1` outline pills) rather than stacked.
- **Sign out** centred ghost link beneath.
- No top "PROFILE" bar is needed on desktop (the floating nav and page context carry it).

---

## Floating nav (the one structural change) — `app/components/App/TabBar.vue`

**What the user asked for:** the tab bar **already** renders as a centred, floating, rounded pill on desktop (`sm:` branch — `sm:w-fit sm:rounded-full sm:border sm:shadow-sm sm:mb-5`) but as a **stretched full-width bottom bar on mobile**. The change is to **use the floating-pill treatment on mobile too**.

Implementation — adjust the existing single `<ul>` so the pill styles are **not** `sm:`-gated:

- Make it always `w-fit`, centred (`mx-auto`), `rounded-full`, `border border-default`, `bg-elevated/95 backdrop-blur`, `shadow-sm`, and lifted off the bottom edge — `mb-5` plus `pb-[env(safe-area-inset-bottom)]` so it clears the iOS home indicator. Keep `fixed inset-x-0 bottom-0 z-40` on the `<nav>` and `print:hidden`.
- Items become horizontal pill segments at **all** widths (icon + label inline, or icon-only on the narrowest screens — the mock shows Discover/My Flowers as icon-only and the active **Profile** as an icon+label peach segment). Keep **44px+ hit targets**.
- **Active state** is a soft peach segment (`bg` peach-100 `#FCE8E3`, `text-primary`) rather than only a colour change — see the active "Profile" pill in the mock. Inactive items `text-muted`, hover `text-default` / faint `rgba(33,30,26,.04)` wash.
- The center **Add** stays a raised circular primary `UButton` (`i-lucide-plus`, `size-12`, `rounded-full`, `shadow-sm`), emitting `add` → layout navigates to `/flowers/new`.
- **All existing logic is unchanged:** tab list, `isGrower` gating (My Flowers + Add growers-only), the logged-out **Start selling** CTA, the `mounted`/hydration guard, `useProfile()` + `authClient.useSession()`. This is a **styling change to the template only**.

> Because the pill is now `w-fit` and centred at every width, double-check it doesn't crowd content on a 320px screen — keep labels short / drop inactive labels to icons under `sm` if needed, and ensure the content column's bottom padding in `app/layouts/app.vue` (`pb-[calc(env(safe-area-inset-bottom)+5rem)]`) still clears the floating pill.

---

## Interactions & behaviour
- **Navigation:** My Flowers / Open → `/flowers`; Invoices → `/invoices`; Edit profile → `/account/edit`; Share → existing `ShareButton` (Web Share API / copy fallback); View public page → `/@{handle}`; Sign out → `handleSignOut` → `/login`. Nav pill: Discover → `/discover`, My Flowers → `/flowers`, Profile → `/account` (active here), Add → `/flowers/new`.
- **Active nav state:** the **Profile** segment shows the active soft-peach treatment on `/account` (`NuxtLink active-class`).
- **Loading states:** keep `startingGrowing` on the Start-growing button and `signingOut` on Sign out (existing `:loading` wiring).
- **Hover:** ~200ms transitions matching existing `UButton` behaviour; soft pills lighten, text links → `text-primary` / slight nudge on the public-page arrow.
- **Responsive:** the two layouts in the file are the **mobile** and **desktop** ends of one responsive page. The content column simply widens and a couple of stacked groups (handle/location, profile-action pills) go inline at `sm`/`md`. The nav pill is now floating at all widths. Use the codebase's existing breakpoints.

## State management
**No new state.** Everything is already in `app/pages/account/index.vue`: `useProfile()` (`profile`, `ensure`, `set`), `avatarSrc` / `initials` / `tint` computeds, `startGrowing` (PATCH `/api/profile { isGrower: true }`), `handleSignOut` (`signOut()` → clear profile → `/login`). Keep `definePageMeta({ middleware: ['auth','onboarding'], layout: 'app' })` and the `noindex` `useSeoMeta`. The **verified tick** in the mock is decorative — only render it if a real verified/trusted flag exists on the profile; otherwise omit it (don't invent the field).

## Design tokens
Source: `app/assets/css/main.css` (`@theme static`), aliased in `app/app.config.ts`. Prefer the semantic aliases in code.

- **Primary / peach:** `peach-100 #FCE8E3` (soft fills — **Open** pills, active nav segment, initials-avatar bg), `peach-500 #E87767` (`primary` — links, eyebrows, verified tick, active nav text, the raised Add button), `peach-700 #B6483B` (text on light peach — Open pill label, initials).
- **Neutral / clay:** page bg `#FFFFFF`; `clay-200 #E9E5DE` (`border-default` hairlines + nav pill border; warmer `#E2DDD4` used on the outline-button borders), `clay-500 #847B6E` (`text-muted` — sub-lines, eyebrow, location, sign-out), `clay-900 #211E1A` (`text-default` ink — name, row headings). Body ink (bio) `#4A453E`; `text-dimmed` ≈ `#A89F92` (handle).
- **Type:** display = **EB Garamond** (`font-display`) — name, the grower-row headings (My Flowers / Invoices), initials avatar. Body/UI = **Inter** — handle, location, bio, eyebrows, all buttons/links/labels.
- **Radius:** avatar `rounded-full`; **Open** pills, outline action buttons and the nav pill itself `rounded-full`; the settings icon button `rounded-full`. (No boxed content cards — see guardrails.)
- **Elevation:** content reads on hairline dividers and typographic rhythm — **no boxed/shadowed content cards** (per `DESIGN.md`). The only shadows are **chrome**: the floating nav pill (`shadow-sm` / a soft `0 10px 30px -10px rgba(33,30,26,.28)` in the mock) and the raised Add button.
- **Spacing:** mobile content `px-6`, sections separated by hairlines at ~18px vertical padding; desktop column `max-w-[680px]` centred with generous top padding and ~22px row padding. Nav pill padding ~`7–9px`, lifted `mb-5` + safe-area.

### Brand guardrails (from `DESIGN.md` — do not reintroduce)
Pure-white app canvas; no shadowy/boxed content cards (rows sit on hairlines); the accent is **coral-peach, not orange**; display serif is **EB Garamond**, no Fraunces / quirky serifs; green is a quiet semantic colour only, not used here; **no em-dashes** and **UK spelling** in copy; warm, calm, honest tone — speaks to the grower.

## Assets
- **No image assets** ship with this design. The avatar is either the grower's uploaded photo (served via the existing image pipeline, `/img/{key}`, as `avatarSrc` already does) or the generated tint+initials circle (`shared/utils/avatar.ts`, already used).
- `image-slot.js` — a prototyping helper that powers the drag-and-drop avatar placeholder in the HTML reference **only**. Do **not** port it; the real avatar is the existing `<img>` / initials block.
- **Icons:** lucide via `UIcon` — `i-lucide-settings`, `i-lucide-badge-check` (verified, optional), `i-lucide-map-pin`, `i-lucide-arrow-up-right`, `i-lucide-arrow-right`, `i-lucide-pencil`, `i-lucide-log-out`, `i-lucide-share-2` (Share), and the nav set `i-lucide-search` / `i-lucide-flower-2` / `i-lucide-user` / `i-lucide-plus`. The SVGs drawn inline in the prototype are stand-ins for these.
- Fonts: EB Garamond + Inter (already configured in `nuxt.config.ts` `fonts`).

## Files
- `Stems Account.dc.html` — the HTML design reference (mobile + desktop side by side).
- `image-slot.js` — prototype-only avatar placeholder helper (**not** for production).

Existing codebase files to update against this design:
- **`app/pages/account/index.vue`** — restyle the template to match (keep all script logic).
- **`app/components/App/TabBar.vue`** — extend the desktop floating-pill style to mobile (the only structural change).
- Reference: `app/layouts/app.vue` (content padding clears the floating pill), `roadmap/03-app-shell-navigation.md` (nav spec / grower gating), `DESIGN.md` (tokens + guardrails).
