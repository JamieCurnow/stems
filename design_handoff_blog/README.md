# Handoff: Blog redesign (index + single post)

## Overview
The **Blog** is the public marketing blog at `/blog` (index) and `/blog/<slug>` (single post). Its job is editorial: notes on growing, seasonality, pricing, and the people behind the flowers — practical reading for growers, plus a little on why local-and-in-season matters. This redesign keeps the blog's existing **white-canvas, EB Garamond, hairline, no-cards** brand spine but **introduces feature images**: a lead image + thumbnailed list on the index, and an optional hero image on each post.

The whole blog is **driven by `@nuxt/content`** (`.md` files in `content/blog/`). This redesign does **not** change that — it adds presentation for an **optional** feature-image field and restyles the two existing pages.

This handoff covers a **mobile** and a **desktop** version of **both** the index and the single post.

## About the design files
The file in this bundle (`Stems Blog.dc.html`) is a **design reference created in HTML** — a prototype showing the intended look and behaviour. It is **not** production code to copy directly.

This design maps onto the **existing Nuxt 3 + Vue 3 + Nuxt UI (Tailwind v4) + @nuxt/content codebase**. Both pages already exist and are the files to **restyle** against this design — recreate the look using the codebase's established patterns, components, and tokens; do not introduce new CSS or a parallel styling approach. Concretely:

- Index page: `app/pages/blog/index.vue` (currently a text-only `divide-y` list, no images)
- Single post: `app/pages/blog/[slug].vue` (currently `ContentRenderer` prose, no hero image)
- Content schema: `content.config.ts` (the `blog` collection — needs **one new optional field**, see below)
- Posts: `content/blog/**/*.md` (frontmatter + markdown body)
- Layout chrome: `default` layout (Stems wordmark + nav + sign-in / "List your flowers" pill, and the footer) — **keep it**; don't rebuild the header/footer inside the page
- Tokens: `app/assets/css/main.css` (`@theme static`) + `app/app.config.ts`
- Brand reference: `DESIGN.md` and `marketing/00-foundations/brand-voice.md`
- Sibling pages to mirror for the floral-wash hero/CTA treatment and section rhythm: `app/pages/how-it-works.vue`, `app/pages/about.vue`

## Fidelity
**High-fidelity.** Final colours, typography, spacing, and layout. Recreate pixel-faithfully using the existing Nuxt UI components and Stems tokens. The hex values below are the source tokens — **prefer the semantic aliases** (`text-muted`, `border-default`, `bg-primary`, `text-primary`, …) over raw hex.

> **Content is real-but-sample.** The lead post ("How to sell your flowers locally without building a website") is the real draft in `content/blog/`. The other three index entries (June "What to grow…", May "Pricing your stems…", May "A quiet note on conditioning dahlias") are **invented to populate the list** and demonstrate states — they are **not** real posts. The post body shown is an **abridged excerpt** of the real markdown; in the app the full body renders via `ContentRenderer`. The fourth list entry is deliberately **image-less** to show the optional-image fallback.

---

## The one schema change (feature image)
Feature images are the only new data this redesign needs, and they must be **optional** (the design works with or without them — that requirement is non-negotiable, posts are CMS-driven and many won't have an image).

Add to the `blog` collection schema in `content.config.ts`:

```ts
// Optional in-body / index feature image. Path under /public or an image-pipeline
// reference. Absent on many posts — every surface must render cleanly without it.
image: z.string().optional(),
// Alt text for the feature image (required whenever `image` is set).
imageAlt: z.string().optional(),
```

This is **separate from the existing `ogImage`** field (which is the social-share image only and is not rendered on-page). A post may set `image`, `ogImage`, both, or neither. If you'd rather reuse `ogImage` as the on-page feature image, that's a product call — but the design assumes a dedicated `image` so social crops and on-page art can differ. Render the feature image **only when `post.image` is truthy**; otherwise omit the element entirely (no placeholder, no reserved gap).

Example frontmatter:
```yaml
---
title: What to grow for a steady summer of cut flowers
description: Succession sowing, the reliable workhorses, and how to keep buckets full.
date: '2026-06-12'
image: /blog/summer-cut-flowers.jpg
imageAlt: Buckets of just-cut cosmos and cornflowers in a Cornish field
draft: false
---
```

---

## Screens / Views

### Shared spine
Both index views and both post views render inside the **`default` layout chrome** (Stems wordmark left; How it works / About / **Blog** (active, `text-primary`) / Sign in / "List your flowers" pill right on desktop; compact wordmark + pill on mobile; the standard footer). Don't rebuild that chrome inside the page — the prototype only includes it so the frames read as full pages.

---

### 1. Blog index — Mobile (430px column)
Single scrolling column.

- **Page header** (floral wash) — full-bleed blurred `hero-flowers.svg` with a white gradient wash fading to solid white (`scale(1.18)`, `blur(24px)`). Eyebrow "Blog" (Inter 600, 11px, `tracking-[0.32em]`, uppercase, `text-primary`). Headline "Notes from the field" (EB Garamond 500, ~40px, `leading-[1.04]`). Sub paragraph (Inter 400, 15px, `text-muted`). *(Copy is identical to today's `index.vue` header.)*
- **Lead post** (most recent) — on white, full-width tappable block linking to the post:
  - **Feature image** (optional): full-width, **212px** tall, `rounded-[14px]`, `object-cover`, ~16px below it the text. Omitted entirely when the post has no `image`.
  - Meta row: date (Inter 600, 11px, `tracking-[0.18em]`, uppercase, `text-muted`) + **Draft pill** if `post.draft` (bg `#FCE3DD`, text `#C0503F`, 9px uppercase `tracking-[0.18em]`, `rounded-full`, ~5×9px padding).
  - Title `h2` (EB Garamond 500, ~27px, `leading-[1.14]`).
  - Description (Inter 400, 15px, `text-muted`).
- **Post list** — hairline-divided (`border-top` `#EFEBE4` per row), each row a tappable block: optional feature image on top (full-width, **170px**, `rounded-[12px]`), then date, title `h3` (EB Garamond 500, ~22px), description (Inter 400, 14px, `text-muted`). The 4th sample row has **no image** → renders as a clean text-only row.
- **Footer** — layout chrome.

### 2. Blog index — Desktop (1280px frame, content `max-w` ≈ 1040px, `px-14`)
Same spine, widened. Note: blog content uses a **slightly narrower max width (≈1040px)** than the marketing pages' 1120px, to keep an editorial reading measure while allowing feature images.

- **Nav + page header** sit inside the floral-wash band (full nav bar above; header left-aligned, `max-w-[680px]`). Headline EB Garamond ~56px (`tracking-[-0.015em]`); sub paragraph Inter 18px `text-muted`.
- **Lead post** — full content-width tappable block, ~24px negative side margins so the **hover wash** (`bg-primary/5` → `#FEF5F3`) has breathing room, `rounded-[14px]`, ~150ms transition. Optional feature image full-width **392px** tall, `rounded-[16px]`, ~26px below it. Meta row (date 12px + Draft pill), title `h2` EB Garamond 500 **~40px** (`leading-[1.1]`, `max-w-[760px]`), description Inter 17px `text-muted` (`max-w-[680px]`).
- **Post list** — rows separated by `border-top` hairlines. Each row is a **two-column flex**: text on the **left** (`flex:1`), feature image **on the right** (300×200px, `rounded-[12px]`, `flex-shrink:0`). Putting the image on the right keeps every row's text left-edge aligned, so **image-less rows just drop the thumbnail** and read as full-width text (the 4th sample row). Same negative-margin hover wash as the lead. Row text: date 12px; title `h3` EB Garamond 500 ~26px; description Inter 16px `text-muted` (`max-w-[560px]`, wider when no image).
- **Footer** — chrome.

> Index layout note: the **lead + list** split is a presentation choice. With one post it shows just the lead; with many, the most-recent post is the lead and the rest are list rows. Implement by taking `posts[0]` as the lead and `posts.slice(1)` as the list (still ordered `date DESC`). If you prefer a uniform list, the row pattern stands alone — but the lead treatment is the intended design.

### 3. Single post — Mobile (430px column)
- **Article header** — on white. "← Blog" back link (Inter 600, 11px, `tracking-[0.18em]`, uppercase, `text-muted`, lucide `arrow-left`). Meta row: date + Draft pill (if draft). Title `h1` (EB Garamond 500, ~31px, `leading-[1.12]`). Description / standfirst (Inter 400, 16px, `text-muted`).
- **Feature image** (optional) — full-width, **230px**, `rounded-[14px]`, `object-cover`, ~26px below the standfirst. Omitted when the post has no `image`; the body then follows the standfirst directly (today's behaviour).
- **Hairline** then **body** — `ContentRenderer` prose. See **Prose styling** below. Mobile prose: paragraphs Inter 15px `leading-[1.66]` `#4A453E`; `h2` EB Garamond 500 ~22px; lists 15px.
- **"← All posts"** link (uppercase, `text-primary`) on a top hairline.
- **Footer** — chrome.

### 4. Single post — Desktop (1280px frame)
- **Nav** in a short floral-wash band (fades to white quickly — not a full hero).
- **Article** — `max-w-[880px]` centred container. The **header column and body column are constrained to `max-w-[720px]`** (centred) for a comfortable reading measure; the **feature image breaks out to the full 880px** between them for impact.
  - Header: "← Blog" back link; meta row (date 12px + Draft pill); title `h1` EB Garamond 500 **~48px** (`leading-[1.08]`, `tracking-[-0.015em]`); standfirst Inter 19px `text-muted`.
  - **Feature image** (optional): full 880px width, **440px** tall, `rounded-[18px]`, `object-cover`, soft media shadow `0 24px 56px -30px rgba(33,30,26,.4)`, ~36px top margin. Omitted when absent → body follows the standfirst.
  - Hairline, then **body** prose (720px column). Desktop prose: paragraphs Inter 17px `leading-[1.72]` `#4A453E`; `h2` EB Garamond 500 ~28px (~42px top margin); `ul`/`ol` 17px with `#C9A99E` markers.
  - **"← All posts"** link on a top hairline.
- **Footer** — chrome.

---

## Prose styling (post body)
The post body is markdown rendered by `@nuxt/content`'s `ContentRenderer` (Nuxt UI Prose components). The existing `[slug].vue` already overrides headings to the display serif via arbitrary descendant selectors:

```
prose max-w-none [&_:is(h1,h2,h3,h4)]:font-display [&_:is(h1,h2,h3,h4)]:font-medium [&_:is(h1,h2,h3,h4)]:tracking-tight
```

Keep that approach and extend it to match the spec:
- **Paragraphs:** Inter 400; desktop 17px / `leading-[1.72]`, mobile 15px / `leading-[1.66]`; colour `#4A453E` (warm body ink, between `text-default` and `text-muted`).
- **`h2`:** EB Garamond 500; desktop ~28px, mobile ~22px; `tracking-tight`; generous top margin (~42px desktop).
- **Unordered + ordered lists:** same body size/colour; ~24px left padding; ~9px between items; list markers tinted `#C9A99E` (`::marker`).
- **`strong`:** `font-weight:600`, colour `text-default` `#211E1A`.
- **Inline links:** `text-primary` `#E87767`, no underline, a soft `1px` bottom border `rgba(232,119,103,.34)`.

(The prototype puts these in a `.prose` / `.prose-m` `<style>` block purely because the design canvas can't reach Nuxt UI's Prose classes — in the app, apply them through the existing Tailwind/`@nuxt/ui` prose config, not a bespoke stylesheet.)

---

## Interactions & behaviour
Static, content-driven marketing pages — no app state, no client mutations.

- **Index data:** keep the existing `useAsyncData('blog-index', …)` with `queryCollection('blog').order('date', 'DESC')`; in production filter `.where('draft', '=', false)`, in dev show all (so drafts preview). Lead = first item, list = the rest.
- **Post data:** keep the existing `queryCollection('blog').path(route.path).first()`; 404 in production when missing or `draft` (dev keeps drafts reachable). Keep `useSeoMeta` + `useSchemaOrg` (`defineArticle` + FAQ `defineQuestion`) exactly as they are.
- **Date format:** keep `Intl.DateTimeFormat('en-GB', { day:'numeric', month:'long', year:'numeric' })`.
- **Draft pill:** render only when `post.draft` (it appears because the sample post is a draft; published posts show no pill).
- **Feature image:** render only when `post.image` is truthy; always pass `imageAlt` as `alt`. Use `<NuxtImg>` for the index thumbnails and post hero so they go through the image pipeline (`roadmap/06-image-pipeline.md`).
- **Navigation:** post titles / lead / rows → `post.path` (`NuxtLink`). "← Blog" and "← All posts" → `/blog`. Inline body links resolve from the markdown (`/about`, `/login`, …). Nav/footer "Blog" shows the active `text-primary` state.
- **Hover:** index lead + list rows get a `bg-primary/5` (`#FEF5F3`) wash with a ~150ms transition and ~24px negative side margin so the wash extends past the text. Links/back-links → `text-primary` / slight opacity on hover (~200ms), matching existing behaviour.
- **Responsive:** the two frames per page are the **mobile** and **desktop** ends of one responsive page. Collapse the desktop list's two-column (text + right thumbnail) into the stacked mobile pattern (image on top) at the `sm`/`md` breakpoint; the post's 880px image break-out collapses to full column width. Use the codebase's existing breakpoints.
- **Empty state:** keep today's `index.vue` fallback — "First post is on its way." when there are no posts.

## State management
None beyond the existing `useAsyncData` content fetches. Public pages on the `default` layout, no auth, no mutations.

## Design tokens
Source: `app/assets/css/main.css` (`@theme static`), aliased in `app/app.config.ts`. Prefer the semantic aliases in code.

- **Primary / peach:** `peach-50 #FEF5F3` (floral-wash fade, index hover wash), `peach-500 #E87767` (`primary` — eyebrows, active nav, links, "All posts" link, "List your flowers" pill). **Draft pill:** bg `#FCE3DD`, text `#C0503F` (a slightly deeper peach for contrast on the tinted chip).
- **Neutral / clay:** page bg `#FFFFFF`; hairlines `#EFEBE4` (warm) and `clay-200 #E9E5DE` (`border-default`); `clay-500 #847B6E` (`text-muted` — dates, descriptions, captions, standfirst); `clay-900 #211E1A` (`text-default` ink — titles, `strong`). Body prose ink `#4A453E`; `text-dimmed` ≈ `#A89F92` (footer tagline); list markers `#C9A99E`.
- **Type:** display = **EB Garamond** (`font-display`) — wordmark, page/post headlines, list titles, prose headings. Body/UI = **Inter** — dates, descriptions, eyebrows, prose paragraphs + lists, buttons, captions.
- **Radius:** post hero image `rounded-[18px]` (desktop) / `rounded-[14px]` (mobile); index lead image `rounded-[16px]` / `rounded-[14px]`; index list thumbnails `rounded-[12px]`; index hover-wash blocks `rounded-[14px]`; pills/buttons `rounded-full`.
- **Elevation:** content reads on hairlines + typographic rhythm — **no boxed/shadowed content cards** (per `DESIGN.md`). The only shadows are the desktop **post hero image** (`0 24px 56px -30px rgba(33,30,26,.4)`, media/chrome) and the small shadow under the header "List your flowers" pill.
- **Feature-image sizes:** index lead 392px (desktop) / 212px (mobile) tall; index list thumb 300×200px (desktop) / 170px tall (mobile); post hero 440px tall × 880px wide (desktop) / 230px tall (mobile). All `object-cover`.
- **Spacing:** blog content `max-w-[1040px]`, `px-14`; post text columns `max-w-[720px]`, post container `max-w-[880px]`. Desktop sections generous; mobile `px-7`.

### Brand guardrails (from `DESIGN.md` / `brand-voice.md` — do not reintroduce)
Pure-white page canvas (floral-wash bands are fine; no cream/beige page background); no shadowy/boxed content cards (the post hero image shadow is media, not a card); the accent is **coral-peach, not orange**; no Fraunces or quirky display serifs; green is a quiet semantic colour only, not used here; **no em-dashes** and **UK spelling** in copy; warm, calm, honest, no lecturing.

## Assets
- `assets/hero-flowers.svg` — the blurred floral wash behind the index header and post nav band. In the live app this is served from `/hero-flowers.svg` (`public/hero-flowers.svg`) — **reuse the existing one**, don't ship a copy.
- **Feature images** — real photographs per post (not in this bundle). Sourced via the existing image pipeline / `public/`, referenced from the new `image` frontmatter field with `imageAlt`. Optional per post.
- `image-slot.js` — a prototyping helper powering the drag-and-drop image placeholders in the HTML reference **only**. Do **not** port it; replace each slot with a real `<NuxtImg>`/`<img>` driven by `post.image`.
- Fonts: EB Garamond + Inter (already configured in `nuxt.config.ts` `fonts`).
- Icons: lucide `arrow-left` (already available via `UIcon` / the existing `i-lucide-arrow-left` usage in `[slug].vue`).

## Files
- `Stems Blog.dc.html` — the HTML design reference (all four frames: index mobile + desktop, post mobile + desktop). Two tweak toggles in the file (`showFeatureImages`, `showDraftBadge`) are **prototype controls** to preview the optional-image and draft/published states — not production props.
- `assets/hero-flowers.svg` — the floral wash image (already in the app at `public/hero-flowers.svg`).
- `image-slot.js` — prototype-only image placeholder helper (not for production).

Existing codebase files to change against this design:
- **`app/pages/blog/index.vue`** — restyle to the lead + thumbnailed-list design; add the optional feature image.
- **`app/pages/blog/[slug].vue`** — add the optional hero image; apply the prose spec.
- **`content.config.ts`** — add the optional `image` (+ `imageAlt`) field to the `blog` collection schema.
- **`content/blog/*.md`** — add `image` / `imageAlt` frontmatter to posts that have a photo (optional).

Reference `app/pages/how-it-works.vue` and `app/pages/about.vue` for the shared floral-wash treatment and section rhythm.
