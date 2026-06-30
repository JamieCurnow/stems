# Handoff: Stems landing page — desktop layout (Direction A)

## Context

The mobile landing page (Direction A) is **already built** in `app/pages/index.vue`.
This package adds the **desktop / wide-viewport layout** for the same page. It is
the **same content, same sections, same copy, same components** — only the
arrangement changes above a breakpoint. Do **not** introduce new sections, new
copy, or a second page.

Treat this as a **responsive layer on top of the existing mobile page**, not a
rebuild. Mobile stays exactly as shipped; desktop is what these rules add.

## Breakpoint

- The mobile layout is the base (no media query).
- Apply the desktop layout at **`lg` (≥1024px)**. Everything below `lg` keeps the
  mobile single-column layout you already built.
- (`md`/tablet, 768–1023px, can keep the mobile column centred — no special
  layout required unless you want one. If you do, the hero can go two-column at
  `md` while "how it works" stays stacked.)

## Container

On `lg+`, content sits in a centred column **capped at ~1120px** with **56px
side padding**, on the **pure white** page. This is deliberate: the brand does
**not** stretch content edge to edge on big screens (DESIGN.md — Instagram-narrow
restraint). Full-bleed bands (hero wash, peach link band, closing wash) still go
edge to edge; only their inner content is capped at 1120px.

In the reference this is the `.wrap` helper (`max-width:1120px; margin:0 auto;
padding:0 56px`). In the app, reuse whatever container utility index.vue already
uses for bands and just raise its max-width / padding at `lg`.

## What changes per section at `lg+`

Sections are the same as mobile. Only layout differs:

1. **Header** — mobile's stacked hero header becomes a **sticky-feeling top
   bar**: serif "Stems" wordmark on the left; on the right a horizontal nav
   (How it works · About · Blog · Policies), a thin divider, a "Sign in" text
   link, and the "List your flowers" pill. The oversized centred "Stems"
   wordmark from mobile is **dropped on desktop** — the wordmark lives in the top
   bar, and the hero headline becomes the value-prop sentence (see Open question).

2. **Hero** — becomes **two columns** (`flex`, `gap:80px`, vertically centred):
   - **Left (max ~540px):** eyebrow "Local · Seasonal · Grown", an `<h1>` value
     headline "A public page for your flower stock, shared with one link."
     (~56px serif), a 17px muted subline, then the primary pill + "or sign in"
     link in a row.
   - **Right:** the **phone mockup**, slightly larger than mobile (300px device,
     600px screen, ~5 flower rows visible). Same component as mobile — just not
     width-constrained by the column.

3. **How it works** — the 3 stacked rows become a **3-column grid**
   (`grid-cols-3`, `gap:48px`), each item **centre-aligned**: icon circle on top,
   serif title, muted body. Same icons, titles, and copy.

4. **One clean link** — same full-bleed peach band, **centred**, type scaled up
   (~40px heading, 24px URL pill). No structural change.

5. **Orders & invoices** — becomes **two columns** (`gap:80px`): copy block on
   the **left** (max ~480px), the **invoice mock card** on the **right** (~420px
   wide, scaled up from the mobile card). Same card anatomy.

6. **Buyer door** — the stacked mobile block becomes a **single centred inline
   row**: the muted line and the outline "Find a grower near you" button sit side
   by side (`flex`, `gap:22px`, `justify-center`, wraps on smaller widths).

7. **Closing** — same full-bleed floral wash, centred, type scaled up
   (~44px heading). Below it, a **real footer bar**: wordmark + eyebrow on the
   left, the nav links repeated on the right, on a hairline top border.

## Type scale (desktop)

Bumped up from mobile; still EB Garamond display + Inter UI.
- Hero `<h1>`: ~56px / line-height 1.04 / `tracking-[-0.015em]`
- Section `<h2>` (how it works, link band, invoices): ~40px
- Closing `<h2>`: ~44px
- Step titles `<h3>`: ~23px
- Body: 16–17px; eyebrows 12px (mobile was 11px)
- Top-bar / footer nav: 13px
Keep mobile sizes unchanged below `lg`.

## Reference file

- **`direction-a-desktop.html`** — self-contained desktop reference; open in a
  browser at full width (it is a 1280px artboard). Loops are expanded to static
  rows; phone shows 5 flowers, invoice card shows 3 line items.
- **`assets/hero-flowers.svg`** — already in `public/`; bundled here for the
  reference only.

## Unchanged from the mobile handoff (still true)

These all carry over from the original Direction A handoff — nothing changes:
- **Design system:** Nuxt UI v4 + Tailwind v4. Use tokens, not raw hex —
  `font-display` (EB Garamond), `text-default`/`text-muted`/`text-dimmed`,
  `border-default`, `text-primary`/`bg-primary` (peach-500 `#E87767`),
  `bg-primary/5` (`#FEF5F3`) for the link band, `bg-primary/10` (`#FCE8E3`) for
  the step-icon circles, peach-700 `#B6483B` for those icons, the **leaf/success**
  semantic for the "Paid" pill.
- **Phone mockup & invoice card are static illustrations** — not wired to live
  data. The phone mirrors `app/pages/@[handle]/index.vue`; the invoice mirrors
  `<InvoiceForm>` / `<InvoiceStatusBadge>` (draft→sent→paid).
- **Auth gating:** keep the existing `useSession()` logic — when authed, CTAs
  read "Open Stems" → `/discover` instead of "List your flowers" → `/login`.
- **Links:** "List your flowers" / "or sign in" → `/login`; "Find a grower near
  you" → `/discover`; nav → `/how-it-works`, `/about`, `/blog`, `/policies`.
- **Icons:** Lucide via `<UIcon>` — `at-sign`, `flower-2`, `link-2`,
  `message-circle`, `arrow-right`, `search`.
- **Photography:** thumbnails + phone banner are gradient **placeholders** —
  swap for real grower photos. Desktop shows them larger, so good imagery matters
  more here.
- **Copy rules:** no em-dashes; UK spelling; warm and plain. Keep all copy as-is.
- **Example data:** Icelandic poppies £1.00, Sweet peas £0.50, Cosmos £0.80,
  Cornflower £0.30, Phlox £0.85 (per stem). Invoice: Cosmos ×40 £32.00, Sweet
  peas ×30 £15.00, Cornflower ×60 £18.00, total **£65.00**, Paid, billed to
  "Mevagissey Flowers".

## One open question for the team

On desktop the hero headline is the **value-prop sentence** and the "Stems"
wordmark moves into the top bar — whereas the mobile hero leads with the big
"Stems" wordmark. This is the intended desktop treatment (the wordmark would feel
oversized in a wide hero). If the team would rather keep "Stems" as the hero
centrepiece on desktop too, that's a small swap — flag it and it can change.
