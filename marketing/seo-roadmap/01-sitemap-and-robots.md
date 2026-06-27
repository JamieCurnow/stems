# 01 — Sitemap & robots.txt

**Goal:** make Stems crawlable. Ship a `sitemap.xml` that lists every public
page **including the dynamic `@handle` grower pages** (queried live from D1), and
a `robots.txt` that allows the public surface, disallows the auth-gated app
routes, and points crawlers at the sitemap. Set `site.url` to the production
origin so absolute URLs are generated correctly.

**Depends on:** nothing. (Recommends the `@nuxtjs/seo` umbrella, which brief 02
also uses — consider doing 01 + 02 in one PR.)
**Blocks:** nothing hard, but every other SEO brief benefits from this landing first.

---

## What already exists (don't rebuild)

- `app/pages/@[handle]/index.vue` — the public grower page. SSR-rendered,
  logged-out reachable. **These are the URLs the sitemap most needs to expose.**
- `server/api/search.get.ts` — already queries `profile` (filtered to
  `isGrower = true`) joined to `flower`. The sitemap source will run a very
  similar Drizzle query.
- `server/db/schema.ts` → `profile` table: `handle` (lowercase, no `@`),
  `isGrower` (boolean), `updatedAt` (`timestamp_ms`). These are the only columns
  the sitemap source needs.
- Public static pages today: `/discover`, `/about`, `/blog`, `/privacy`,
  `/cookies`, `/policies` (confirm the exact set against `app/pages/` at build time).
- Auth-gated routes to **exclude**: `/flowers`, `/flowers/**`, `/invoices`,
  `/invoices/**`, `/account`, `/account/**`, `/onboarding`, `/login`, plus
  `/api/**` and any `/r/**` referral / `/email/**` routes.

---

## Recommendation: install the `@nuxtjs/seo` umbrella

There are two ways to get sitemap + robots:

- **Individual modules:** `@nuxtjs/sitemap` + `@nuxtjs/robots`.
- **Umbrella:** `@nuxtjs/seo`, which bundles `@nuxtjs/sitemap`, `@nuxtjs/robots`,
  `nuxt-schema-org`, `nuxt-seo-utils`, and `nuxt-site-config`.

**Recommendation: install the umbrella `@nuxtjs/seo`** but register the
sub-modules individually (the LAND pattern), so we can deliberately **omit
`nuxt-og-image`** (it crashes on the Cloudflare dev preset — see brief 02).

> Trade-off: the umbrella pulls a few modules we only fully use in briefs 02/03
> (`nuxt-schema-org`, `nuxt-seo-utils`, `nuxt-site-config`). That's fine — they're
> inert until configured, and briefs 02/03 need them anyway. Registering the
> sub-modules by name (not `'@nuxtjs/seo'`) is what lets us skip `nuxt-og-image`.

### Install

```bash
npm install @nuxtjs/seo
```

### Register sub-modules (NOT the umbrella name) in `nuxt.config.ts`

Add to the existing `modules` array. Match the LAND ordering:

```ts
modules: [
  '@nuxt/eslint',
  '@nuxt/ui',
  '@pinia/nuxt',
  '@vueuse/nuxt',
  '@vite-pwa/nuxt',
  // SEO — pulled in individually so we can skip `nuxt-og-image`
  // (it crashes the Cloudflare dev preset). Static `/og.png` instead (brief 02).
  '@nuxtjs/sitemap',
  '@nuxtjs/robots',
  'nuxt-schema-org', // configured in brief 02
  'nuxt-seo-utils', // configured in brief 02
  'nuxt-site-config' // configured in brief 02
]
```

> Note: brief 02 owns the `nuxt-schema-org` / `nuxt-seo-utils` config and the
> full `site: {}` block. This brief only needs `site.url` (below). If you land 01
> alone, add just `site: { url: 'https://stems.market' }` and let 02 fill in the rest.

---

## What to build

### 1. Set the site URL

In `nuxt.config.ts` (top-level key, sibling to `modules`):

```ts
site: {
  url: 'https://stems.market'
}
```

This is what `@nuxtjs/sitemap` uses to build absolute `<loc>` entries. Brief 02
expands this block with `name`, `description`, `defaultLocale`.

> Domain note: production is **`stems.market`**, not `stems.app`. Several files
> still hard-code `stems.app` — brief 02 fixes them. Use `stems.market` here.

### 2. Configure the sitemap

Add a `sitemap` block to `nuxt.config.ts`:

```ts
sitemap: {
  // Static public pages are auto-discovered from the route table, but the
  // dynamic `@handle` grower pages are not — this endpoint enumerates them.
  sources: ['/api/__sitemap__/urls'],
  exclude: [
    '/flowers',
    '/flowers/**',
    '/invoices',
    '/invoices/**',
    '/account',
    '/account/**',
    '/onboarding',
    '/login',
    '/r/**',
    '/email/**'
  ]
}
```

> `@nuxtjs/sitemap` auto-includes static prerenderable routes. It will try to
> include the `@[handle]` route as a literal `:handle` placeholder — the
> `sources` endpoint provides the real URLs, and the route param itself won't
> render a valid page, so confirm the literal `/@:handle` pattern isn't emitted
> (add it to `exclude` if it appears, e.g. `'/@*'`).

### 3. Dynamic sitemap source — public grower pages from D1

Create `server/api/__sitemap__/urls.ts`. This mirrors
`LAND/nuxt-app/server/api/__sitemap__/urls.ts`, but Stems has **no `@nuxt/content`
yet** (that's brief 03) — the source here queries **D1 via Drizzle**:

```ts
// server/api/__sitemap__/urls.ts
// Feeds the public @handle grower pages to @nuxtjs/sitemap. Wired in via
// `sitemap.sources` in nuxt.config.ts. Only published growers (isGrower = true)
// are listed — the same filter the /discover search uses.
//
// `defineSitemapEventHandler` is auto-imported by @nuxtjs/sitemap.
import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { profile } from '~~/server/db/schema'

export default defineSitemapEventHandler(async (event) => {
  const db = useDb(event)

  const growers = await db
    .select({ handle: profile.handle, updatedAt: profile.updatedAt })
    .from(profile)
    .where(eq(profile.isGrower, true))
    .all()

  return growers.map((g) => ({
    // The browser URL carries the '@'; the stored handle does not.
    loc: `/@${g.handle}`,
    lastmod: g.updatedAt.toISOString()
  }))
})
```

Notes:
- `useDb(event)` is the request-scoped Drizzle client (Cloudflare bindings only
  exist per-request). Do not query at module load.
- `profile.updatedAt` is a `timestamp_ms` column → Drizzle returns a `Date`, so
  `.toISOString()` gives a valid `<lastmod>`.
- This is a server route, so the `useFetch`/`useRequestFetch` SSR caveat does
  **not** apply.
- Scale: at launch (tens to hundreds of growers) a full `select` is fine. If the
  grower count grows large, paginate or cap the sitemap (sitemaps allow up to
  50k URLs per file; `@nuxtjs/sitemap` auto-chunks beyond that).

### 4. Configure robots.txt

Add a `robots` block to `nuxt.config.ts`. `@nuxtjs/robots` generates
`/robots.txt` at runtime and **automatically appends the `Sitemap:` line**
(pointing at `${site.url}/sitemap.xml`) when `@nuxtjs/sitemap` is present — so
you do **not** hand-write a `public/robots.txt` (a static file would override
the module and lose the sitemap pointer).

```ts
robots: {
  disallow: [
    '/flowers',
    '/invoices',
    '/account',
    '/onboarding',
    '/login',
    '/r/',
    '/email/',
    '/api/'
  ]
}
```

> Do **not** create `public/robots.txt`. If one exists, delete it — the module
> output is richer (it adds the sitemap pointer and host directives). Everything
> not disallowed is allowed by default, which is what we want for the public
> surface (`/`, `/discover`, `/about`, `/blog`, `/@handle`, legal pages).

---

## Verification

- `npm run dev`, then open:
  - `http://localhost:3000/robots.txt` — shows the disallow list + a
    `Sitemap: https://stems.market/sitemap.xml` line.
  - `http://localhost:3000/sitemap.xml` — lists the static public pages **and**
    one `<url>` per seeded grower (`/@handle`), with `<lastmod>`. Seed data lives
    in `seed-dev.sql`; run `npm run db:migrate` and confirm seeded growers appear.
- Confirm **no** auth-gated route (`/flowers`, `/account`, `/onboarding`,
  `/login`, `/invoices`) appears in `sitemap.xml`.
- `npm run build` succeeds on the `cloudflare-module` preset (the LAND repo
  proves these modules build on this preset).

---

## Done when

- [ ] `@nuxtjs/seo` installed; `@nuxtjs/sitemap` + `@nuxtjs/robots` registered by
      name in `modules` (umbrella name not used, so `nuxt-og-image` stays out).
- [ ] `site.url` set to `https://stems.market`.
- [ ] `/sitemap.xml` includes all public static pages **and** every `isGrower`
      profile as `/@handle` with a `lastmod`, via `server/api/__sitemap__/urls.ts`.
- [ ] `/sitemap.xml` excludes all auth-gated routes and `/api/**`.
- [ ] `/robots.txt` disallows the app routes and points at the sitemap.
- [ ] No hard-coded `stems.app` introduced (use `stems.market`).
- [ ] `npm run typecheck && npm run lint && npm run build` clean.
