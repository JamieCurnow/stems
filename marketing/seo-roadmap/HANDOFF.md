# Technical SEO: developer handoff

**You are a developer agent. Your job is to make Stems crawlable, shareable, and
ready to rank, by implementing the four briefs in this folder.** This document is
your kickoff: it tells you the order, the rules, the traps, and how to know you're
done. The briefs are the source of truth for *what to build*; this is *how to run
the work*.

> Kick off with: "Read `marketing/seo-roadmap/HANDOFF.md` and execute it."

---

## 0. Orient yourself first (do not skip)

Read these before writing any code. They are the contract.

1. **`AGENTS.md`** (repo root) — architecture, conventions, the documentation
   system, auto-imports. Stems is **Nuxt 4 + Nuxt UI v4 + Nitro on Cloudflare
   Workers** (`cloudflare-module` preset), **Drizzle on D1**, **Better Auth**
   magic-link. Production domain is **stems.market**.
2. **`roadmap/00-conventions.md`** — the house rules these briefs follow.
3. **`.agent/rules/`** — always-on rules. The load-bearing ones here:
   - `styling.md`: **Tailwind only, no custom CSS files.** Use the design tokens.
   - `creating-pages.md`: componentise, set `definePageMeta` layout, `useSeoMeta`.
   - `fetching-data.md`: `useFetch`/`$fetch` for public reads; `useRequestFetch()`
     for auth-dependent reads. (Sitemap DB sources run server-side in Nitro, so
     that caveat does not apply to them.)
   - `git.md`: **never run `git commit` or `git push`.** Make the changes; leave
     committing to Jamie unless he tells you otherwise.
4. **`DESIGN.md`** — brand tokens for any UI (briefs 03, 04): pure white canvas,
   peach-500 accent (`#E87767`, not orange), EB Garamond display + Inter body,
   `max-w-screen-sm` column, borderless rows on hairline dividers. **No shadowed
   cards, no cream backgrounds, no orange, no Fraunces.**
5. **`marketing/seo-roadmap/README.md`** — the gap analysis, priority order, and
   the cross-cutting risks. Read the "Cross-cutting risks" section twice.
6. **The reference implementation**: a fully-wired version of this exact stack
   (Nuxt 4 + Cloudflare + `@nuxt/content` + `@nuxtjs/seo`) lives in the sibling
   repo `../../LAND/nuxt-app` (relative to this repo: `/Users/JCGeek/Documents/Projects/LAND/nuxt-app`).
   The briefs quote it. When in doubt about config or a Workers quirk, read how
   LAND did it. It is the proof this works on the `cloudflare-module` preset.

The brand/voice docs in `marketing/00-foundations/` drive any user-facing copy
you write (briefs 03 and 04). **No em-dashes in any copy. UK spelling.**

---

## 1. Branch & workflow

- Ask Jamie if there's a ClickUp ticket. If yes, branch off `main` as
  `CU-[ticketId]-technical-seo` (per `AGENTS.md` branch convention). If no ticket,
  use `feature/technical-seo` off `main`, git-flow style, and offer to make a
  ticket.
- Work brief by brief. **01 and 02 can land in one PR** (they share the
  `@nuxtjs/seo` install). **03 and 04 are separate PRs** (feature-sized).
- After each brief, run the verification steps in section 4 before moving on.
- Do not commit or push (see `git.md`). Surface the diff and the verification
  output to Jamie and let him drive git.
- **Update the catalog docs** as you go (the documentation system in `AGENTS.md`):
  new/changed pages → `app/pages/PAGES.md`; new server endpoints (the sitemap
  source) → `server/SERVER_ENDPOINTS.md`. AGENTS.md files are read-only.

---

## 2. The work, in order

Do them in this sequence. Each brief is self-contained with file paths, snippets,
and a "Done when" checklist. Summary here so you can see the whole shape:

### Brief 01 — Sitemap & robots  (quick win, do first)
`marketing/seo-roadmap/01-sitemap-and-robots.md`
- Install the `@nuxtjs/seo` umbrella, but register the **sub-modules
  individually** so `nuxt-og-image` is left out (it crashes the Cloudflare dev
  preset, confirmed in LAND). You want `@nuxtjs/sitemap`, `@nuxtjs/robots`,
  `nuxt-schema-org`, `nuxt-seo-utils`, `nuxt-site-config`.
- Set `site.url: 'https://stems.market'`.
- `robots.txt` via the module (do **not** hand-write `public/robots.txt`):
  disallow `/flowers`, `/invoices`, `/account`, `/onboarding`, `/login`, and the
  API; allow the rest; point at the sitemap.
- Dynamic sitemap source at `server/api/__sitemap__/urls.ts` that enumerates the
  public `@handle` grower pages by querying D1 (same `profile` filter the
  `/discover` search uses), plus the static public pages.

### Brief 02 — Global SEO & schema  (quick win, land with 01)
`marketing/seo-roadmap/02-global-seo-and-schema.md`
- `nuxt-site-config` (url / name / description / `defaultLocale: 'en-GB'`), a
  global title template, and global `useSeoMeta` defaults.
- **Default OG image: ship a static `public/og.png`** (1200x630, Stems brand).
  Do **not** add `nuxt-og-image`. The og.png itself is a design asset — if it
  doesn't exist yet, flag it to Jamie and stub with a placeholder so the meta
  wiring is testable.
- Global `useSchemaOrg` in `app.vue`: `defineOrganization` (legal entity is
  **Guardline Ltd**, company no. 13323382, hello@stems.market — see `privacy.vue`)
  + `defineWebSite`. This **complements** the existing per-grower
  `LocalBusiness`/`Person` JSON-LD on `@[handle]/index.vue`; don't remove that.
- Canonical strategy.
- **Fix the domain bug fully.** `stems.market` is canonical (Jamie confirmed).
  The two load-bearing user-facing refs in `discover.vue` and `onboarding.vue`
  are **already fixed**. Brief 02 lists any remaining `stems.app` occurrences
  (e.g. in `roadmap/*.md`) — grep the repo (`grep -rn "stems.app"`) and make sure
  none remain in code or user-facing copy. Do not introduce new ones.

### Brief 03 — Content / blog system  (larger; the trickiest Cloudflare work)
`marketing/seo-roadmap/03-content-blog-system.md`
- Install `@nuxt/content` v3, define the `blog` collection in `content.config.ts`
  (schema: title, description, date, keyword, tags, draft, ogImage, faq).
- **The single trickiest change:** `nuxt.config.ts` has `ignore: ['**/*.md']`
  (keeps catalog docs out of Nuxt). `@nuxt/content` collides with this. Add the
  `'!content/**/*.md'` negation in **both** the top-level and `nitro` ignore
  arrays, or Content sees zero posts. See the brief's gotcha section.
- Import `queryCollection` from `@nuxt/content/nitro` in the sitemap server file,
  not the auto-import (which mis-resolves to the client type server-side).
- Turn `app/pages/blog.vue` into a real index + add `app/pages/blog/[slug].vue`,
  styled in the Stems brand (EB Garamond, peach, `max-w` prose, hairline
  dividers — match `privacy.vue`/`discover.vue`). Draft posts hidden in prod and
  excluded from the sitemap. `defineArticle` + `defineQuestion` (FAQPage) JSON-LD.
- **A first post already exists** at
  `content/blog/how-to-sell-flowers-locally-without-a-website.md` (`draft: true`).
  Once the system works, it should render in dev. Leave it `draft: true` — Jamie
  publishes it.
- Add the new blog routes to the sitemap (non-draft only) — reconcile with the
  source built in brief 01.
- **Smoke-test on the real runtime**, not just `nuxt dev`: run `wrangler dev`
  (or `npm run cf:dev`) and confirm the content DB resolves on Workers. This is
  where Cloudflare surprises live.

### Brief 04 — Marketing home page  (larger)
`marketing/seo-roadmap/04-marketing-home-page.md`
- Recommendation in the brief: **keep `/discover` as-is and replace the
  `index.vue` 302 redirect with a real growers-first landing page at `/`.**
  Confirm this with Jamie before building (it changes the logged-out entry point
  and the PWA start_url is `/discover`, so think through both).
- Growers-first hero ("List your flowers") with a quiet door for buyers ("find a
  grower near you"), Stems brand, full-bleed hero like `discover.vue`. Inherits
  canonical + schema + OG from 01/02.
- Copy comes from `marketing/00-foundations/` (brand-voice + positioning) and the
  live `about.vue` — pull from there, don't free-write a new pitch.

---

## 3. Hard constraints (the traps)

1. **Do not add `nuxt-og-image`.** It breaks the Cloudflare dev preset. Static
   `/og.png` only.
2. **`@nuxt/content` needs the `ignore` negation** in nuxt.config (both arrays).
   Without it: zero posts, silently.
3. **Verify on `wrangler dev`, not only `nuxt dev`.** The Workers runtime is
   where D1/content issues surface. `nuxt dev` passing is necessary, not
   sufficient.
4. **No custom CSS.** Tailwind + design tokens only (`.agent/rules/styling.md`).
5. **Don't break the existing `@[handle]` SEO.** Its per-page `useSeoMeta` and
   JSON-LD are the best surface in the app; the global defaults must complement,
   not clobber it (per-page wins; last write wins).
6. **No new `stems.app` references.** Ever.
7. **No em-dashes** in any copy you write. UK spelling.
8. **No `git commit` / `git push`.**

---

## 4. Verification (run after each brief, before handing back)

General:
- `npm run lint` and `npm run typecheck` clean.
- `npm run format:check` clean (or run `npm run format`).
- `npm run build` succeeds (the `cloudflare-module` build, not just dev).

Brief 01/02:
- `http://localhost:3000/robots.txt` lists the disallows + a `Sitemap:` line
  pointing at `https://stems.market/sitemap.xml`.
- `http://localhost:3000/sitemap.xml` lists the static public pages **and** the
  live `@handle` grower pages (seed a profile locally to confirm the dynamic
  source). Auth-gated routes are **absent**.
- View-source on `/` and `/@somehandle`: a global `Organization` + `WebSite`
  JSON-LD block is present; the grower page still has its own `LocalBusiness`/
  `Person` block. Validate with Google's Rich Results Test or
  `schema-dts`/`structured-data-testing` if available.
- Share-unfurl: pages without their own image fall back to `/og.png` (check the
  `og:image` meta resolves to an absolute `https://stems.market/og.png`).
- `grep -rn "stems.app"` returns nothing in `app/`, `server/`, `shared/`.

Brief 03:
- `wrangler dev` (or `npm run cf:dev`): `/blog` renders the index, and the
  drafted first post renders at its slug in **dev** (and is hidden / 404 in a
  production build). The post is **not** in the sitemap while `draft: true`.
- FAQ JSON-LD (`FAQPage`) present on the post that has `faq` frontmatter.

Brief 04:
- `/` renders the landing page (no redirect), is indexable (no `noindex`),
  inherits the global OG/canonical/schema, and matches the brand. PWA
  `start_url` behaviour still sane.

Optional but ideal: a Lighthouse SEO pass on `/`, `/about`, `/blog`, and a
`/@handle` page — aim for 100 SEO, and note any a11y regressions.

---

## 5. When you're done

Hand back to Jamie with, per brief / PR:
- The diff summary and which briefs it covers.
- The verification output (the checks in section 4, pass/fail).
- Any drift you found between the briefs and the live repo (flag it; the briefs
  are point-in-time).
- Anything you stubbed or deferred (e.g. the `og.png` design asset, a ticket).
- Updated catalog docs (`PAGES.md`, `SERVER_ENDPOINTS.md`) noted.

Then stop and let Jamie review and commit. Do not push.

---

## 6. Quick reference

- Briefs: `marketing/seo-roadmap/0{1,2,3,4}-*.md` (+ `README.md`).
- Reference repo: `/Users/JCGeek/Documents/Projects/LAND/nuxt-app` (nuxt.config,
  content.config, `app/pages/blog/*`, `server/api/__sitemap__/urls.ts`).
- Brand tokens: `DESIGN.md`. Voice/copy: `marketing/00-foundations/`.
- First blog post (already written, `draft: true`):
  `content/blog/how-to-sell-flowers-locally-without-a-website.md`.
- Canonical domain: **stems.market**. Legal entity: **Guardline Ltd** (13323382).
- Order: **01 + 02 together**, then **03**, then **04**. Verify on `wrangler dev`.
