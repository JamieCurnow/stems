# Handoff: Stems landing page (Direction A)

## Overview

A redesign of the public marketing landing page at **`/`** (the file
`app/pages/index.vue`). It replaces the current long, text-heavy page with a
shorter, image-led, mobile-first page built around **one centrepiece: a phone
mockup of a real grower's Stems page**. The job to be done: a small flower
grower lands here, instantly understands "this is a public page for my flower
stock that I share with one link", sees proof, and signs up.

Primary action: **List your flowers** (grower sign-up → `/login`). A quiet
secondary door points buyers to `/discover`.

## About the design files

The files in this bundle are **design references created in plain HTML/CSS**.
They show the intended look, copy, layout, and spacing. They are **not
production code to paste in**.

This project already has its environment: **Nuxt 4 (Vue 3) on Cloudflare
Workers, Nuxt UI v4, Tailwind CSS v4**. The task is to **rebuild this design as
`app/pages/index.vue`** using the existing Stems design system and components,
not to ship the HTML. Almost every visual token below already exists in the
codebase, so prefer the codebase token over the raw hex.

Key references in the repo:
- **`DESIGN.md`** — the canonical brand/design system. Read it first.
- **`app/pages/index.vue`** — the current landing page being replaced (reuse its
  hero scaffold, SEO meta, and auth-gating logic; see "State" below).
- **`app/pages/@[handle]/index.vue`** — the real public grower page. The phone
  mockup and the example flower rows are a miniature of this. Match its row
  anatomy (`avatar/banner`, availability list, `divide-y divide-default`).
- **`app/components/Grower/Card.vue`** — the borderless feed-row pattern.
- **`app/assets/css/main.css`** (`@theme static`) + **`app/app.config.ts`** —
  where all colour/semantic tokens live.

## Fidelity

**High-fidelity.** Final colours, type, spacing, copy and structure. Rebuild it
faithfully, but **express every value through the existing design system**: use
`font-display` (EB Garamond) and the default Inter sans, the `peach`/`clay`
tokens, `<UButton>`, `text-muted`/`text-default`/`border-default`, the
`max-w-screen-sm` column and the full-bleed floral wash. The hex values in this
doc are the source of truth for *what the tokens should resolve to*, not an
instruction to hard-code hex.

---

## Layout

The page renders with **`definePageMeta({ layout: false })`** (same as the
current index): the hero **is** the header, no app tab bar. Everything sits in a
centred **`max-w-screen-sm` (640px)** column on a **pure white** canvas; full-bleed
bands (hero wash, link band, closing) break out to `w-screen` while their text
stays in the column (the existing `mx-[calc(50%-50vw)] w-screen` trick).

Mobile-first. The reference frame is drawn at 430px wide; on desktop it is the
same centred column, not a stretched layout (Instagram-narrow is intentional,
per DESIGN.md).

Section order, top to bottom:

1. **Hero / header** (full-bleed floral wash)
2. **Centrepiece** — eyebrow + headline, then the **phone mockup**
3. **How it works** — 3 borderless steps
4. **One clean link** band (peach-50 wash)
5. **Orders & invoices** — copy + invoice mock card
6. **Buyer door** — quiet secondary CTA
7. **Closing** CTA + footer wordmark (full-bleed floral wash)

---

## Sections & components

Spacing note: values below are from the 430px reference. Use the codebase's
existing rhythm utilities; the current index.vue uses `py-16 sm:py-20` per band
and `px-6` gutters. Keep that scale rather than copying px literally.

### 1. Hero / header
- **Background:** `public/hero-flowers.svg`, `bg-cover bg-center`, `scale-110`,
  `blur-xl`, with a white gradient overlay `from-white/45 via-white/40 to-white`
  on top (identical to current index.vue hero). Reuse it verbatim.
- **Eyebrow:** "Local · Seasonal · Grown" — Inter 600, 11px, `uppercase`,
  `tracking-[0.3em]`, colour **peach-500 `#E87767`** (`text-primary`).
- **Wordmark `<h1>`:** "Stems" — `font-display` (EB Garamond) 500, ~64px mobile /
  72px sm, `tracking-tight`, `text-default` `#211E1A`. Keep the existing
  `sr-only` keyword continuation inside the H1 for SEO.
- **Tagline:** "Local-grown flowers, straight from the grower" — Inter 400, 15px,
  `text-muted` `#847B6E`, max-width ~228px, centred.
- **Primary CTA:** `<UButton to="/login" color="primary" size="lg">` pill,
  "List your flowers". White text on `#E87767`, `rounded-full`, generous px.
- **Secondary:** `<UButton to="/login" variant="link" color="neutral"
  trailing-icon="i-lucide-arrow-right">` "or sign in", `text-muted`.
- **Utility nav:** How it works · About · Blog · Policies — Inter 600, 11px,
  `uppercase`, `tracking-[0.2em]`, `text-muted`, `·` separators in a dimmer tone,
  hover → `text-primary`. Links: `/how-it-works`, `/about`, `/blog`, `/policies`.

### 2. Centrepiece (the key change)
- **Eyebrow:** "What it is" — peach, same eyebrow style, `tracking-[0.3em]`.
- **Headline `<h2>`:** "A public page for your flower stock, shared with one
  link." — `font-display` 500, ~31px, `tracking-tight`, `text-default`,
  max-width ~320px, centred. (This is intentionally plain/concrete — do not make
  it abstract.)
- **Phone mockup** — a stylised device showing a real grower page. This is a
  *presentational illustration*, not the live `/@handle` component, but it
  mirrors it 1:1 so it reads as authentic:
  - Device: 272px wide, 7px dark bezel `#1c1a17`, `border-radius:42px`, soft drop
    shadow. Screen `border-radius:34px`, `overflow:hidden`, white, ~498px tall,
    a thin pill "notch" near the top.
  - **Banner:** ~98px, a soft green-cream floral gradient
    (`linear-gradient(150deg,#EAEFE4,#D2DCC6,#EAE2D2)`) under a faint 45°
    placeholder stripe. **In production, swap for a real banner image** (see
    Assets) — this is a placeholder.
  - **Avatar:** 58px circle, 3px white ring, peach gradient
    (`#FCE8E3→#F2A491`), serif initials "JF" (mirror `avatarTint` / serif
    initials from `shared/utils/avatar.ts`). Overlaps the banner (`margin-top:-29px`).
  - **Name:** "Juliette Florence Flowers" — `font-display` 500, 17px.
  - **Meta:** "@julietteflorence · Bissoe & Mithian" — Inter 400, 10px, `text-muted`.
  - **Contact pill:** peach `#E87767`, white text, `i-lucide-message-circle`
    glyph + "Contact".
  - **Availability header row:** small-caps "Availability" `text-muted` left;
    "● 21 in season" right in **peach** with a 5px peach dot.
  - **4 flower rows**, hairline-divided (`border-top:#F0ECE5`), each: a portrait
    thumbnail (38×46, `radius:6px`, a per-flower warm gradient + placeholder
    stripe + faint `i-lucide-flower-2` glyph) then name (`font-display` 12px) /
    meta (Inter 9px muted) / "Availability · £price" (price in `text-default`).
    See **Example data** for the four rows.
  - **Bottom fade:** 74px white gradient overlay implying the list scrolls on.
- **Caption** under the phone: "A real grower's page. Twenty-one stems in season,
  updated an hour ago, all on one link." — Inter 13px, `text-muted`, centred.

### 3. How it works
- Eyebrow "How it works" (peach) + `<h2>` "From the cutting patch to one link"
  (`font-display` 500, ~27px), centred.
- 3 rows on hairline dividers (`divide-y divide-default`, `py-7`), each: a 44px
  circle `bg-primary/10` with a peach-700 `#B6483B` lucide icon, then serif title
  + muted body. Mirror the current index.vue "steps" block exactly.
  1. **`i-lucide-at-sign`** — "Claim your handle" — "Your farm name, your area, a
     line about who you are. Set up in the time it takes to have a coffee."
  2. **`i-lucide-flower-2`** — "List what's in season" — "Each variety, its
     colour, the price per stem, a photo. It looks every bit as good as the
     flowers do."
  3. **`i-lucide-link-2`** — "Share one link" — "Top of your Instagram, in your
     bio, on a market sign. One link instead of typing the list out again."

### 4. One clean link (band)
- Full-bleed band, background **peach-50 `#FEF5F3`** (`bg-primary/5`).
- Eyebrow "One clean link" + `<h2>` "A page that works the moment you share it".
- **URL pill:** white pill, `ring-1` peach-100 border, `shadow-sm`,
  `font-display` 18px: `stems.market/` + `@you` in peach.
- Body: "No app to download, no sign-in to look. They click, see what is in this
  week, and reach you the way they always have. We never take a cut." — muted,
  max-width ~300px.

### 5. Orders & invoices (new section)
Surfaces the invoicing + contacts feature. Backed by real app behaviour: see
`app/pages/invoices/new.vue`, `app/components/Invoice/Form.vue`, and
`COMPONENTS.md` (`<InvoiceForm>`): a grower saves buyers as reusable **contacts**,
adds invoice lines via **"Add from flowers"** (prefills description + unit price
from their flower list, keeps a soft `flowerId` link), sets VAT, and the invoice
moves through **draft → sent → paid** (`<InvoiceStatusBadge>`).
- White background, `border-top` hairline.
- Eyebrow "Orders & invoices" (peach) + `<h2>` "Got an order? Send an invoice in
  seconds." (`font-display` 500, ~27px).
- Body: "Save your buyers as contacts, then bill them straight from your flower
  list. Pick the stems, set the amounts, send a tidy invoice. Mark it paid when
  the money is in." — muted, max-width ~300px.
- **Invoice mock card** (presentational; this is the only intentionally "boxed"
  element besides the phone — acceptable because it's an illustration of the
  printable invoice document, not a content card):
  - White card, 1px `#EFE7E2` border, `radius:14px`, soft shadow, max-width 330px.
  - Header: "INVOICE" (`font-display`, tracked, uppercase) + number "INV-0007"
    (muted) on the left; a **"Paid"** status pill on the right — green using the
    **success/leaf** semantic (`bg success/12`, text `#5C7F5A`). Match
    `<InvoiceStatusBadge>` colours (draft=neutral, sent=info, paid=success).
  - "Billed to" label (uppercase micro, muted) + "Mevagissey Flowers".
  - 3 line items, hairline-divided, each "Name · N stems" left and right-aligned
    `tabular-nums` amount: Cosmos · 40 stems → £32.00, Sweet peas · 30 stems →
    £15.00, Cornflower · 60 stems → £18.00.
  - **Total** row (serif label) → **£65.00** (`tabular-nums`).
  - Footer micro-line with a faint flower glyph: "Pulled straight from your
    flower list".
  - (The line totals are unit price × stems from the example data, e.g.
    Cosmos £0.80 × 40 = £32.00. Keep them consistent if you change the numbers.)

### 6. Buyer door
- White, `border-top` hairline, centred, deliberately subordinate.
- Muted line: "Just here to buy? Find a local grower by name or area, no account
  needed."
- `<UButton variant="outline" color="neutral">` pill with `i-lucide-search`:
  "Find a grower near you" → `/discover`. (Use `outline`, not `soft` — soft is
  invisible on white, per DESIGN.md.)

### 7. Closing
- Full-bleed floral wash (same SVG, anchored bottom, white overlay fading from
  the top so it bookends the hero).
- `<h2>` "Give your flowers a good shopfront" + muted sub "It takes an evening,
  and most of that is choosing the photos. The flowers do the rest."
- Primary CTA "List your flowers" → `/login`.
- Footer: serif "Stems" wordmark (~23px) + "Local · Seasonal · Grown" eyebrow,
  above a hairline.

---

## Interactions & behaviour
- **CTAs** are the only interactive elements. "List your flowers" and "or sign
  in" → `/login`; "Find a grower near you" → `/discover`; utility-nav links go to
  their pages. Standard `<NuxtLink>`/`<UButton :to>` navigation.
- **Hover:** buttons use the Nuxt UI defaults; nav links transition to
  `text-primary` (`transition-colors duration-200`). No new motion is required.
- **No client state, forms, or data fetching** are introduced by this page
  beyond what's already in index.vue. The phone mockup and invoice card are
  **static illustrations** — do not wire them to live data.
- **Responsive:** single column at every width, centred, `max-w-screen-sm`.
  Type steps up slightly at `sm` (e.g. wordmark 64→72px) as the current page does.

## State management
Carry over the existing logic from `app/pages/index.vue` unchanged:
- `authClient.useSession()` → `isAuthed` / `showSignedOutCta` (gated on
  `!session.isPending` so the signed-out CTA doesn't flash for logged-in users on
  refresh). When authed, the primary CTAs read **"Open Stems"** → `/discover`
  instead of "List your flowers".
- `useSeoMeta({ title, description })` — keep the current title/description.

## Design tokens
All of these already exist in `main.css` / `app.config.ts` — use the token, not
the hex.

**Colour**
- Page background: **#FFFFFF** (`--ui-bg`)
- Ink / text: **clay-900 #211E1A** (`text-default`)
- Muted text: **clay-500 #847B6E** (`text-muted`); dimmer meta ≈ **#A89F92** (`text-dimmed`)
- Hairline / border: **clay-200 #E9E5DE** (`border-default`); lighter internal rules ≈ #EFEBE4 / #F0ECE5
- Primary accent: **peach-500 #E87767** (`text-primary` / `bg-primary`)
- On-tint text: **peach-700 #B6483B** (icons on `bg-primary/10`)
- Soft fills: **peach-50 #FEF5F3** (`bg-primary/5`), **peach-100 #FCE8E3** (`bg-primary/10`)
- Success (Paid pill): **leaf** semantic, used at ~12% bg / `#5C7F5A` text
- Avatar peach gradient: `#FCE8E3 → #F2A491`

**Type**
- Display: **EB Garamond** (`font-display`) 500, used for wordmark, headlines,
  farm/flower names, invoice "Total". `tracking-tight` on big headings.
- UI/body: **Inter** (default sans) 400/500/600.
- Eyebrows: Inter 600, 11px, `uppercase`, `tracking-[0.3em]` (hero/section) or
  `[0.18–0.2em]` (utility nav / small-caps labels).

**Shape & elevation**
- Pills `rounded-full` (buttons, URL chip, status pill); cards `radius:14px`;
  phone `radius:42px` (screen 34px); thumbnails 6px.
- Shadows only on *chrome/illustration* (phone, invoice card, URL pill), never on
  content feed rows — borderless rows on hairlines (DESIGN.md anti-pattern).

## Assets
- **`public/hero-flowers.svg`** — already in the repo (bundled here under
  `assets/` for the reference). Blurred floral wash behind the hero and closing.
- **Icons** — Lucide via Nuxt UI `<UIcon>`: `i-lucide-at-sign`,
  `i-lucide-flower-2`, `i-lucide-link-2`, `i-lucide-message-circle`,
  `i-lucide-map-pin`, `i-lucide-arrow-right`, `i-lucide-search`. (The reference
  inlines these as raw SVG; use `<UIcon>` in production.)
- **Flower & banner photography** — the thumbnails and the phone banner are
  **placeholders** (warm gradient tiles). Replace with real grower photos when
  available. The design is built to carry real imagery and will improve markedly
  with it.

## Example data (the phone list + invoice lines)
Mirrors the live page `stems.market/@julietteflorence`. Used in the phone mockup
(first 4) and the invoice card.

| Flower | Meta | Availability | Price/stem |
|---|---|---|---|
| Icelandic poppies | Peach, white · 40cm | Good | £1.00 |
| Sweet peas | Scented mix · 30cm | Limited | £0.50 |
| Cosmos | Double cranberry · 60cm | Limited | £0.80 |
| Cornflower | Blue · 50cm | Available | £0.30 |

Invoice lines: Cosmos ×40 = £32.00, Sweet peas ×30 = £15.00, Cornflower ×60 =
£18.00, **Total £65.00**, status **Paid**, billed to "Mevagissey Flowers".

## Copywriting rules (do not break)
From `DESIGN.md` / `marketing/00-foundations/brand-voice.md`:
- **No em-dashes anywhere.** Commas/full stops/colons only.
- **UK spelling** (colour, realise, neighbour).
- Warm, plain, unhurried; never hyped or corporate. Lead with the grower and the
  flowers, not the software. Keep all the copy in this design as-is unless the
  team revises it.

## Files in this bundle
- `direction-a-landing.html` — self-contained reference (open in any browser).
  Single mobile-width column; the `<sc-for>` loops from the prototype are
  expanded to static rows here.
- `assets/hero-flowers.svg` — the floral wash asset (also already in `public/`).
- `README.md` — this document.

The source prototype lives in the design project as `Stems Landing.dc.html`
(Direction A is the left frame; Direction B is an alternate that was not chosen).
