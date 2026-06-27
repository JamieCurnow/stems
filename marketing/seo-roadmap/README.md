# Stems — Technical SEO Roadmap

Implementation briefs for getting Stems crawlable, shareable, and ranking. These
are **planning docs**: each numbered brief is self-contained and dispatchable to
a developer (or a future agent) with no further context. Follow the same house
rules as `roadmap/`: read `roadmap/00-conventions.md` first, trust the live repo
over the doc, and flag drift in your PR.

> House style: **no em-dashes** in any copy or doc. **UK spelling** throughout.

> **Handing this to a developer agent?** Start them on
> [`HANDOFF.md`](./HANDOFF.md) — it sequences all four briefs, lists the
> Cloudflare traps, and defines the verification + done criteria.

---

## Current state (what SEO already exists)

Stems is a Nuxt 4 app on Cloudflare Workers (`cloudflare-module` preset). Today:

- **Per-page `useSeoMeta`** on the public pages: `discover.vue`, `about.vue`,
  `blog.vue`, `privacy.vue` (and siblings). Titles + descriptions only; no
  shared title template, no OG image.
- **Rich per-grower SEO** on `app/pages/@[handle]/index.vue`: full `useSeoMeta`
  (OG + Twitter card, absolute OG image resolved from the request origin) plus
  inline **JSON-LD** (`LocalBusiness` / `Person`). This page is the best SEO
  surface in the app and the briefs below are designed to complement it, not
  replace it.
- **`app.head`** in `nuxt.config.ts`: viewport, PWA/apple meta, theme-colour,
  favicons. No `<title>` template, no canonical, no global OG.
- **PWA manifest** with `start_url: /discover`.

## What is missing (the gap)

| Gap | Impact |
|---|---|
| **No `sitemap.xml`** | Crawlers can't discover the public `@handle` grower pages (the growth wedge) or the static pages. |
| **No `robots.txt`** | No crawl directives; auth-gated routes (`/flowers`, `/invoices`, `/account`, `/onboarding`, `/login`) are not disallowed; no sitemap pointer. |
| **No global Organization / WebSite schema** | No site-level entity for Google's knowledge graph; no `WebSite` + `SearchAction`. |
| **No default OG image** | Pages without a per-page image (home, about, blog, legal) unfurl bare on WhatsApp / iMessage / social. |
| **No canonical strategy** | Risk of duplicate-URL dilution (trailing slash, query strings on `/discover`). |
| **No `site.url`** | Nothing tells Nuxt the production origin, so any absolute-URL generation is ad hoc. |
| **No blog / content system** | `blog.vue` is a "coming soon" placeholder. No way to publish SEO content. |
| **Home is a 302 to `/discover`** | No dedicated, indexable marketing landing page; `index.vue` redirects. |
| **`about.vue` is a placeholder** | No real "about" content for users or crawlers. |
| **Domain inconsistency** | Code references `stems.app`; production is `stems.market`. See brief 02. |

---

## Priority-ordered index

| # | Brief | What it ships | Size | Why this order |
|---|---|---|---|---|
| 01 | [Sitemap & robots](./01-sitemap-and-robots.md) | `sitemap.xml` (incl. dynamic `@handle` pages from D1) + `robots.txt` + `site.url` | **Quick win** | Highest crawl impact for least effort. Unblocks indexing of the wedge. |
| 02 | [Global SEO & schema](./02-global-seo-and-schema.md) | `nuxt-site-config`, global meta defaults + `/og.png` fallback, `Organization` + `WebSite` schema, canonical strategy, **fix `stems.app` → `stems.market`** | **Quick win** | Site-wide baseline every other page inherits. Resolves the domain bug. |
| 03 | [Content / blog system](./03-content-blog-system.md) | `@nuxt/content` v3, blog collection, real `/blog` index + `/blog/[slug]`, Article + FAQPage JSON-LD | **Larger** | Content engine for organic growth. Heaviest Cloudflare-compat work. |
| 04 | [Marketing home page](./04-marketing-home-page.md) | Replace the `index.vue` redirect with a growers-first landing page | **Larger** | Needs 01/02 in place first so it inherits canonical + schema + OG. |

**Suggested path:** 01 → 02 (both small, land together) → then 03 and 04 in
parallel. 01 and 02 are the "do these this week" wins; 03 and 04 are
feature-sized.

### Dependencies at a glance

- **01** depends on nothing. Recommends the `@nuxtjs/seo` umbrella (also used by 02).
- **02** shares the umbrella install with 01; do them in one PR if convenient.
- **03** depends on 02 (inherits `site.url`, title template, OG fallback).
- **04** depends on 01 + 02 (canonical, schema, OG) and lightly references 03's
  brand/prose patterns.

---

## Reference implementation

A fully-wired version of this exact stack (Nuxt 4 + Cloudflare + `@nuxt/content`
+ `@nuxtjs/seo`) lives in the sibling repo `LAND/nuxt-app`. The briefs quote it
directly. Key files:

- `LAND/nuxt-app/nuxt.config.ts` — the `@nuxtjs/seo` sub-module config (note: it
  deliberately **omits `nuxt-og-image`** because it crashes dev; ships a static
  `/og.png` instead).
- `LAND/nuxt-app/content.config.ts` — the blog collection schema.
- `LAND/nuxt-app/app/pages/blog/index.vue` + `blog/[slug].vue` — blog rendering,
  draft handling, `defineArticle` / `defineQuestion`.
- `LAND/nuxt-app/server/api/__sitemap__/urls.ts` — dynamic sitemap source.

---

## Cross-cutting risks (read before starting any brief)

1. **Cloudflare Workers `cloudflare-module` preset.** `@nuxtjs/sitemap`,
   `@nuxtjs/robots`, `nuxt-schema-org`, `nuxt-seo-utils`, `nuxt-site-config` all
   run fine on this preset in the LAND repo. **`nuxt-og-image` does not** — skip
   it and ship a static `/og.png` (brief 02).
2. **`@nuxt/content` v3 on Workers** needs the `ignore` negation so Content can
   read `content/**/*.md` while Nuxt keeps ignoring every other markdown file.
   See brief 03 — this is the single trickiest config change.
3. **Domain inconsistency.** `stems.app` is hard-coded in several files; prod is
   `stems.market`. Brief 02 lists every file to fix. Do not introduce new
   `stems.app` references.
4. **`useFetch` vs `useRequestFetch`.** Sitemap DB sources run server-side
   (Nitro), not in the page, so this caveat does not apply to them. It still
   applies to any new page reads — see `.agent/rules/fetching-data.md`.
