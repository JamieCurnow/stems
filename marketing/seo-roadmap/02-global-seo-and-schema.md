# 02 — Global SEO defaults & structured data

**Goal:** establish a site-wide SEO baseline every page inherits: a site config
(`url` / `name` / `description` / locale), global `useSeoMeta` defaults with a
**static `/og.png` fallback**, global `Organization` + `WebSite` schema, and a
canonical-URL strategy. Also **resolve the `stems.app` → `stems.market` domain
inconsistency** across the codebase.

**Depends on:** 01 (shares the `@nuxtjs/seo` install; registers `nuxt-site-config`,
`nuxt-schema-org`, `nuxt-seo-utils`).
**Blocks:** 03, 04 (both inherit the title template, OG fallback, and canonical
behaviour from here).

---

## What already exists (don't rebuild)

- `app/pages/@[handle]/index.vue` — already does **per-page** `useSeoMeta` (OG +
  Twitter, absolute OG image from the request origin) and inline JSON-LD
  (`LocalBusiness` / `Person`). **This brief is the site-level layer beneath it.**
  The grower page's `@type: LocalBusiness/Person` complements the global
  `Organization` (Stems the company) + `WebSite` (the site) — they describe
  different entities, so both coexist. Do not remove the grower JSON-LD.
- `nuxt.config.ts` → `app.head`: favicons, PWA/apple meta, `theme-color`,
  `htmlAttrs.lang: 'en'`. No `<title>` template, no canonical, no global OG.
- Per-page `useSeoMeta` on `discover.vue`, `about.vue`, `blog.vue`,
  `privacy.vue`, etc. — these set page titles/descriptions and will inherit the
  global title template + OG fallback added here.
- `privacy.vue` establishes the operating entity: **Guardline Ltd**, registered
  in England and Wales, company number **13323382**, contact **hello@stems.market**.
  Use these exact details in the `Organization` schema.

---

## Recommendation: static `/og.png`, NOT `nuxt-og-image`

`nuxt-og-image` generates per-page social images at runtime. **Do not install
it.** In the LAND sibling repo (same Nuxt 4 + `cloudflare-module` stack) it
**crashed dev** (it prompts for a renderer over a TTY and pulls a heavy
browser/satori runtime that misbehaves on the Workers preset). LAND deliberately
ships a single static `/og.png` instead, and so should Stems.

> The one page that genuinely needs a dynamic, per-entity OG image — the grower
> page — **already builds its own** absolute OG image URL from the grower's
> banner/avatar in `@[handle]/index.vue`. Everything else (home, about, blog
> index, legal) can share one branded `/og.png`. That covers the real need
> without the runtime cost.

**Action:** design and add `public/og.png` — 1200x630, Stems brand (pure white
background, EB Garamond "Stems" wordmark, peach-500 accent; see `DESIGN.md`).
This is a design asset task; flag it to whoever owns brand assets.

---

## What to build

### 1. Site config (`nuxt-site-config`)

Expand the `site` block in `nuxt.config.ts` (brief 01 set `url` only):

```ts
site: {
  url: 'https://stems.market',
  name: 'Stems',
  description: 'The marketplace for local-grown flowers. Find local flower growers near you and contact them directly.',
  defaultLocale: 'en-GB'
}
```

`defaultLocale: 'en-GB'` is correct for a UK product and drives `og:locale` +
`inLanguage` defaults. (Note `app.head.htmlAttrs.lang` is currently `'en'` —
optionally tighten to `'en-GB'` for consistency.)

### 2. Global SEO meta defaults

`nuxt-seo-utils` gives a site-wide title template and OG defaults. Add to
`nuxt.config.ts`:

```ts
seo: {
  // Appends the brand to every page title set via useSeoMeta({ title }).
  // e.g. useSeoMeta({ title: 'About' }) → "About · Stems".
  // (Match the existing convention — discover.vue uses "Discover growers";
  //  about/blog/privacy already write "… · Stems" by hand. Once the template
  //  is global, strip the manual " · Stems" suffixes from those pages so the
  //  brand isn't doubled.)
  titleTemplate: '%s · Stems'
}
```

Then add **global OG defaults** so every page unfurls with the brand image even
without per-page OG. The cleanest place is `app/app.vue` (runs on every route),
mirroring LAND's approach of referencing a static `/og.png`:

```vue
<!-- app/app.vue (script setup) -->
<script setup lang="ts">
const site = useSiteConfig()

useSeoMeta({
  ogSiteName: 'Stems',
  ogType: 'website',
  ogImage: `${site.url}/og.png`,
  twitterCard: 'summary_large_image',
  twitterImage: `${site.url}/og.png`
})
</script>
```

> Per-page `useSeoMeta` calls (e.g. the grower page's own `ogImage`) **override**
> these defaults for that route — last write wins — so the grower page keeps its
> dynamic banner image while every other page falls back to `/og.png`. Confirm
> `app.vue` still wraps `<NuxtLayout><NuxtPage /></NuxtLayout>` (per the build
> gotcha in MEMORY.md) when editing it.

### 3. Canonical URLs

`nuxt-seo-utils` auto-injects `<link rel="canonical">` on every page using
`site.url` + the current path, with trailing-slash + query-string normalisation.
This is on by default once the module is registered — no per-page work needed.

Two things to verify:
- `/discover` carries query params (`?q=`) for search. Confirm the canonical for
  `/discover?q=roses` points at `/discover` (canonical should drop the volatile
  query). `nuxt-seo-utils` strips query strings from canonicals by default;
  verify in the rendered HTML.
- The grower page `/@handle` should self-canonical to
  `https://stems.market/@handle`. Verify the `@` is preserved (not URL-encoded
  to `%40`) in the emitted canonical.

### 4. Global structured data (`nuxt-schema-org`)

Add site-wide `Organization` + `WebSite` schema once, in `app/app.vue`
(alongside the OG defaults above). This is the company-level entity; the grower
pages add their own `LocalBusiness`/`Person` on top.

```ts
// app/app.vue (same <script setup>)
useSchemaOrg([
  defineOrganization({
    name: 'Stems',
    // Operating entity per privacy.vue: Guardline Ltd, England & Wales, 13323382.
    legalName: 'Guardline Ltd',
    url: 'https://stems.market',
    logo: 'https://stems.market/logo.svg', // public/logo.svg exists
    email: 'hello@stems.market',
    description: 'The marketplace for local-grown flowers.'
  }),
  defineWebSite({
    name: 'Stems',
    inLanguage: 'en-GB'
  })
])
```

> Optional enhancement: add a `SearchAction` (sitelinks search box) pointing at
> `/discover?q={search_term_string}` since `/discover` already does live search.
> `nuxt-schema-org` supports this via `WebSite.potentialAction`; treat as a
> nice-to-have, not a blocker.

> `public/logo.svg` exists. Confirm it renders acceptably as a schema logo
> (square-ish, on transparent/white). If not, point `logo` at a PNG icon
> (`/pwa-512x512.png`).

### 5. Resolve the `stems.app` → `stems.market` inconsistency

Production is **`stems.market`** (confirmed in `privacy.vue`, contact emails, and
the prod-launch memory). Several files still hard-code the wrong `stems.app`.
**Fix every one.** Current offenders (grep `stems\.app` before and after):

| File | Line | Current | Fix to |
|---|---|---|---|
| `app/pages/discover.vue` | ~46 | invite mailto body: `https://stems.app` | `https://stems.market` |
| `app/pages/onboarding.vue` | ~114 | handle preview `stems.app/@…` | `stems.market/@…` |
| `roadmap/04-auth-onboarding.md` | ~75 | `stems.app/@yourname` (doc copy) | `stems.market/@yourname` |
| `roadmap/README.md` | ~28, 50, 115 | `stems.app/@handle` (doc copy) | `stems.market/@handle` |
| `roadmap/08-public-profile-availability.md` | ~3, 102 | `stems.app/@handle` (doc copy) | `stems.market/@handle` |

- The **code** files (`discover.vue`, `onboarding.vue`) are the load-bearing
  fixes — they put the wrong domain in front of users.
- The **roadmap docs** are historical; update them too for consistency, or at
  minimum add a one-line note that prod is `stems.market`. Confirm with the dev
  whether the roadmap docs are frozen.
- After fixing, `grep -rn "stems\.app"` should return **zero** matches outside
  this brief's own table. Add no new `stems.app` references anywhere.

> Better long-term: read the origin from `useSiteConfig().url` (client) or
> `useRequestURL().origin` (SSR) instead of hard-coding any domain in copy. Where
> a literal is unavoidable (e.g. a mailto body), use `stems.market`.

---

## Done when

- [ ] `nuxt-site-config`, `nuxt-seo-utils`, `nuxt-schema-org` registered (from
      the 01 install) and the full `site: {}` block is set.
- [ ] `seo.titleTemplate` is `'%s · Stems'`; manual " · Stems" suffixes removed
      from per-page `useSeoMeta` so the brand isn't doubled.
- [ ] `public/og.png` (1200x630, brand) exists and is referenced as the global
      OG + Twitter image; pages without their own image unfurl with it.
- [ ] Every public page emits a `<link rel="canonical">` to its `stems.market`
      URL; `/discover?q=…` canonicalises to `/discover`; `/@handle` self-canonicals.
- [ ] Site-wide `Organization` (legalName Guardline Ltd, 13323382) + `WebSite`
      JSON-LD render on every page; the grower page's own JSON-LD still renders.
- [ ] `nuxt-og-image` is **not** installed.
- [ ] `grep -rn "stems\.app"` returns zero matches (code + docs fixed).
- [ ] `npm run typecheck && npm run lint && npm run build` clean.
