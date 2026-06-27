# 04 — Marketing home page

**Goal:** replace the bare `index.vue` 302-redirect with a real, indexable
marketing landing page that speaks to **growers first** ("List your flowers")
with a quiet door for buyers, in the Stems brand. Give Google and first-time
visitors a proper front door instead of bouncing them straight into `/discover`.

**Depends on:** 01 (sitemap/robots), 02 (canonical, `Organization`/`WebSite`
schema, `/og.png`, title template). Lightly references 03's brand/prose patterns.
**Blocks:** nothing.

---

## What already exists (don't rebuild)

- `app/pages/index.vue` — currently just `definePageMeta({ layout: false })` +
  `await navigateTo('/discover', { redirectCode: 302 })`. A TODO already says
  "build a proper public marketing landing page". This brief is that work.
- `app/pages/discover.vue` — the public discovery feed. Has the full-bleed
  blurred-floral hero (`bg-[url('/hero-flowers.svg')]`), the "Stems" wordmark in
  `font-display text-6xl`, the eyebrow ("Local · Seasonal · Grown"), the "List
  your flowers" / "or sign in" CTA pattern, and the quiet utility nav
  (About · Blog · Policies). **Reuse this visual language**; it's the established
  brand hero.
- `app/pages/about.vue` / `blog.vue` — the eyebrow + `font-display` heading +
  soft CTA pattern for branded sections.
- `app/layouts/default.vue` — the slim public chrome (wordmark + sign-in), used
  by the standalone public pages. The marketing home should use `default`, **not**
  the `app` shell (no bottom tab bar on a landing page).
- Brand + voice: `marketing/00-foundations/positioning.md`,
  `brand-voice.md`, `social-voice.md` — **these drive the copy**. Design tokens:
  `DESIGN.md`, `app/assets/css/main.css` (peach-500 accent, EB Garamond display,
  Inter body, pure white canvas, `max-w-screen-sm` content column).

---

## Decision: dedicated `/` landing page, keep `/discover` separate

**Recommendation: build a real landing page at `/` and keep `/discover` as the
app's discovery feed + PWA `start_url`.** Do **not** make `/discover` the home.

Why:
- `/discover` is the **signed-in PWA entry** (`start_url: /discover`) and lives
  under the `app` layout with the bottom tab bar. A marketing home has a
  different job (convert a cold visitor → grower signup) and different chrome
  (`default` layout, no tab bar).
- SEO: the root URL is the highest-authority page on the domain. Spending it on a
  302 to `/discover` wastes it and gives crawlers/AI engines no brand-level
  landing content. A real `/` lets `Organization`/`WebSite` schema (brief 02) and
  a clear value proposition live at the canonical root.
- Returning PWA users still launch into `/discover` via `start_url`; the landing
  page is for first-touch web visitors arriving from search/social.

So: `/` = marketing landing (this brief). `/discover` = unchanged.

> Edge case to handle: signed-in users hitting `/` on the web. Decide with the
> dev whether to (a) show them the landing page anyway (simplest, fine), or
> (b) soft-redirect authed sessions to `/discover`. Recommendation: **show the
> landing page to everyone** and let the header CTA adapt (signed-in users see
> "Go to my page" instead of "List your flowers"), reusing the
> `authClient.useSession()` + `showSignedOutCta` pattern already in `discover.vue`.

---

## What to build

Replace `app/pages/index.vue` entirely. Structure (mobile-first, single
`max-w-screen-sm` column, full-bleed hero like `discover.vue`):

```vue
<script setup lang="ts">
definePageMeta({ layout: 'default' })

useSeoMeta({
  // Root page: an explicit title (the template still appends ' · Stems').
  title: 'Local-grown flowers, straight from the grower',
  description:
    'Stems is the marketplace for local flower growers. List your flowers, share one clean link, and let buyers find you. Free to start.'
})
// Organization + WebSite schema come from app.vue globally (brief 02) — no
// per-page schema needed here.
</script>
```

### Sections (top to bottom)

1. **Hero (full-bleed, growers-first).** Reuse the `discover.vue` blurred-floral
   treatment (`mx-[calc(50%-50vw)] w-screen`, `bg-[url('/hero-flowers.svg')]`,
   white gradient scrim). Content:
   - Eyebrow: `Local · Seasonal · Grown` (peach, uppercase, tracked) — matches discover.
   - `font-display` H1 — the value proposition for **growers**, e.g.
     "Sell your flowers, straight from the plot." (final copy from
     `positioning.md` / `brand-voice.md`).
   - One-line subhead aimed at growers.
   - Primary CTA: **"List your flowers"** → `/login` (the signup path; magic-link
     onboarding takes it from there). Pill button, `color="primary"`, `size="lg"`
     — identical styling to `discover.vue`.
   - Secondary, quieter link: **"Looking for flowers? Browse growers"** →
     `/discover` (the buyer door, deliberately understated).

2. **How it works (growers).** Three calm steps, borderless (no cards — Toast x
   Instagram language): claim your `@handle` → add your flowers with photos →
   share one link (`stems.market/@you`). Use `font-display` step headings, Inter
   body. Pull copy from `positioning.md`.

3. **The shareable link (the wedge).** A short section showing the
   `stems.market/@handle` proposition — one clean link that works logged-out, no
   app for buyers to download. (This is the core product insight from
   `roadmap/README.md`.)

4. **Buyer's quiet door.** A small, secondary block: "Just here to buy? Search
   local growers near you." → `/discover`. Keep it visually subordinate to the
   grower CTA.

5. **Closing CTA + footer nav.** Repeat "List your flowers" → `/login`, and the
   quiet utility nav (About · Blog · Policies) exactly as `discover.vue` renders
   it.

### Brand / token rules (from DESIGN.md)

- Pure white background; **peach-500** (`text-primary` / `color="primary"`) is
  the only pop colour.
- Headings `font-display` (EB Garamond); body Inter.
- `max-w-screen-sm` content column; hero is full-bleed to `100vw`.
- Pill buttons (`rounded-full`), soft variants for secondary actions.
- Tailwind utilities only — **no custom CSS** (`.agent/rules/styling.md`).
- **No em-dashes** in any copy. UK spelling.

### Adapt the CTA to auth state (recommended)

Reuse the exact pattern from `discover.vue`:

```ts
import { authClient } from '~/utils/auth-client'
const session = authClient.useSession()
const isAuthed = computed(() => !!session.value.data?.user)
const showSignedOutCta = computed(() => !session.value.isPending && !isAuthed.value)
```

Show "List your flowers" → `/login` when signed out; when signed in, show "Go to
my page" / "Open Stems" → `/discover`. Gating on `!isPending` avoids the
CTA flashing for already-signed-in users on refresh (the comment in
`discover.vue` explains the SSR reasoning — reuse it).

---

## Out of scope

- Don't change `/discover` or the PWA `start_url`.
- Don't build new shared components unless a section is genuinely reusable —
  prefer inlining in `index.vue` (this is one bespoke page). If a hero block is
  shared with `discover.vue`, consider extracting a `MarketingHero` component
  per `.agent/rules/creating-components.md`, but only if it earns it.
- Final marketing copy is a **content task** — pull from
  `marketing/00-foundations/`. This brief fixes the structure, routing, brand,
  and SEO wiring; the words are sourced from the foundations docs.

---

## Done when

- [ ] `app/pages/index.vue` renders a real, SSR landing page (no 302 redirect);
      `/` returns 200 with crawlable content.
- [ ] Uses the `default` layout; growers-first hero with a "List your flowers"
      primary CTA → `/login` and a quiet `/discover` buyer door.
- [ ] CTA adapts to auth state (signed-in users routed to `/discover`/their page).
- [ ] Brand-correct: white canvas, peach-500 accent, EB Garamond display,
      `max-w-screen-sm` column, full-bleed hero, pill buttons; no custom CSS.
- [ ] Inherits the global title template, canonical, `/og.png`, and
      `Organization`/`WebSite` schema from brief 02 (no per-page schema added).
- [ ] `/` appears in `sitemap.xml`; copy contains no em-dashes; UK spelling.
- [ ] `npm run typecheck && npm run lint && npm run build` clean.
