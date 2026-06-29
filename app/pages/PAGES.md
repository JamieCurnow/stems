# Pages

This file documents the pages in the app — route, purpose, layout, and any special logic. File-based routing: the directory structure maps to the route.

| File                | Route           | Layout    | Auth                               |
| ------------------- | --------------- | --------- | ---------------------------------- |
| `index.vue`         | `/`             | `default` | public (marketing landing)         |
| `discover.vue`      | `/discover`     | `app`     | public                             |
| `@[handle].vue`     | `/@:handle`     | `app`     | public                             |
| `login.vue`         | `/login`        | `default` | public                             |
| `onboarding.vue`    | `/onboarding`   | `default` | `auth`, `onboarding`               |
| `flowers.vue`       | `/flowers`      | `app`     | `auth`, `onboarding` (grower-only) |
| `invoices/index.vue` | `/invoices`     | `app`     | `auth`, `onboarding` (grower-only) |
| `invoices/new.vue`  | `/invoices/new` | `app`     | `auth`, `onboarding` (grower-only) |
| `invoices/[id]/index.vue` | `/invoices/:id` | `app` | `auth`, `onboarding` (grower-only) |
| `invoices/[id]/edit.vue` | `/invoices/:id/edit` | `app` | `auth`, `onboarding` (grower-only) |
| `account/index.vue` | `/account`      | `app`     | `auth`, `onboarding`               |
| `account/edit.vue`  | `/account/edit` | `app`     | `auth`, `onboarding`               |
| `account/invoice-settings.vue` | `/account/invoice-settings` | `app` | `auth`, `onboarding` (grower-only) |
| `about.vue`         | `/about`        | `default` | public                             |
| `blog/index.vue`    | `/blog`         | `default` | public                             |
| `blog/[slug].vue`   | `/blog/:slug`   | `default` | public                             |
| `policies.vue`      | `/policies`     | `default` | public                             |
| `privacy.vue`       | `/privacy`      | `default` | public                             |
| `cookies.vue`       | `/cookies`      | `default` | public                             |

---

## `/` (index.vue)

PUBLIC growers-first marketing landing (SSR, indexable — no redirect). Uses `layout: false` so the **hero is the header**, exactly like `/discover` (which sits on the chrome-less `app` layout): no top bar, a full-bleed floral hero (blurred `/hero-flowers.svg` wash, eyebrow, big EB Garamond "Stems" wordmark, "List your flowers" → `/login` + "or sign in", and the `How it works · About · Blog · Policies` utility nav **below the CTA**, same styling as the `discover.vue` hero). Sections below: a warm manifesto (peach band), how-it-works as three floral-icon feature blocks (not big numerals), the shareable-link wedge (`stems.market/@you` chip), a subordinate buyer door, and a closing CTA over a second floral wash. The hero CTA adapts to auth state (`authClient.useSession()` gated on `!isPending`, like `discover.vue`): signed-in users see "Open Stems" → `/discover`. Inherits canonical + `Organization`/`WebSite` schema + `/og.png` from `app.vue`. The PWA `start_url` remains `/discover`; this is the first-touch web front door.

The `default` layout header (used by the other public content pages, **not** the index) carries the same shared utility nav (`How it works · About · Blog · Policies`, current page highlighted via `active-class`), so how-it-works, about, blog, policies, privacy, cookies (and login/onboarding) can reach the others. `/discover` and `/` keep the nav in their own heroes instead.

---

## `/discover` (discover.vue)

PUBLIC grower discovery — the app's main entry. Reachable logged-out; signed-in users see it under the `app` tab bar.

- Branded hero (name + slogan over a blurred floral wash). The "List your flowers" CTA is logged-out-only, gated on `session.isPending` to avoid flashing for signed-in users.
- Search box → `useFetch('/api/search', { query: { q: debouncedQ } })`. Term debounced ~250ms (`refDebounced`); empty term returns the recently-active browse list.
- Renders `<GrowerCard>` rows in a borderless feed; skeleton, "nothing matched" (with an invite-a-grower mailto), and "first blooms coming soon" empty states.
- A quiet utility nav (`About · Blog · Policies`) sits in the hero between the sign-in CTA and the sticky search, styled like the `Local · Seasonal · Grown` eyebrow. Always shown; links to the standalone `default`-layout public pages.

---

## `/@:handle` (@[handle]/index.vue)

PUBLIC grower page — the shareable wedge. SSR-rendered so link previews (WhatsApp/iMessage/Instagram) resolve and availability is in the first paint.

- Fetches `/api/public/<bareHandle>` (the route param's leading `@` is stripped via `normaliseHandle`), keyed `public-profile-<handle>`; throws a 404 page on miss.
- Hero (banner or blurred floral wash + avatar/initials, name, handle, location), bio, links, an inline "Contact" button (opens `<ContactSheet>`), `<ShareButton>`, and an "Updated X ago" line from the freshest visible flower.
- Availability is a borderless feed; each row is a `<NuxtLink>` to `/@handle/<flowerId>` showing an "Availability: …" line (`availabilityText`, plain text — no badge), price, and a per-flower "Updated X ago" (`timeAgo`). Sold-out flowers are dimmed and sorted last (done server-side).
- Full `useSeoMeta` (OG/Twitter, absolute OG image resolved against the request origin) + JSON-LD (`LocalBusiness`/`Person`).

---

## `/@:handle/:flowerId` (@[handle]/[flowerId].vue)

PUBLIC, read-only flower detail — a real page (previously a bottom drawer, which couldn't scroll when a flower ran taller than the viewport). SSR-rendered so an individual flower is shareable.

- Reuses the grower-page payload via the SAME `useFetch` key (`public-profile-<handle>`), so arriving from the listing is instant (no refetch) and the profile is on hand for the contact sheet. Resolves the flower by `id` from `flowers`; 404s on an unknown/archived id.
- `<FlowerGallery>` (keyed by id), serif name, subtitle, the same "Availability: …" line, price, "Open to offers" badge, stem/bunch meta, "Updated X ago", notes, and a "Contact" CTA (`<ContactSheet>`).
- Back affordance is a button calling `router.back()` when app history exists (so the grower list's saved scroll position is restored) — falling back to `/@handle` for deep-links. Scroll restoration on back is otherwise Nuxt's default + the cached payload (stable list height, no refetch).
- Per-flower `useSeoMeta` (OG `product`, first photo as the absolute OG image).

---

## `/login` (login.vue)

Email-OTP sign-in (`layout: default`, `robots: noindex`). Two steps: email → `authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' })`, then a 6-digit code → `authClient.signIn.emailOtp({ email, otp })`. On verify, navigates to a safe `?redirect` path or `/account`; brand-new (profile-less) accounts are bounced to `/onboarding` by the `onboarding` middleware on the destination page. A code (not a magic link) is used deliberately: on iOS, a home-screen PWA has a cookie jar isolated from Safari, and a link always opens in Safari, so its session cookie lands in the wrong container; a code typed into the PWA sets the cookie in the PWA's own context. Shows an "enter your code" step, a referral-applied alert (`?ref=`), and a stale-magic-link alert (`?error=`). Magic link stays wired server-side (`server/utils/auth.ts`) for browser sign-in.

---

## `/onboarding` (onboarding.vue)

Claim a handle + create the profile (`layout: default`, middleware `['auth', 'onboarding']`). Any signed-in user can reach it; the `onboarding` middleware bounces people who already have a profile to `/discover`.

- Live handle availability via `watchDebounced` (400ms) → `/api/profile/handle-available`, with stale-response guarding and client-side `validateHandle`.
- Submits to `POST /api/profile`, then `useProfile().set(created)` so the tab bar reflects `isGrower` without a reload, and navigates to `/account`.

---

## `/flowers` (flowers.vue)

The grower's working surface — "My Flowers" (`layout: app`, middleware `['auth', 'onboarding']`, `robots: noindex`). Non-growers are bounced to `/account` (`watchEffect` on `profile.isGrower`).

- Loads `useFetch('/api/flowers', { key: 'my-flowers' })`. Add/edit are **dedicated pages** (not a drawer): the Add buttons + the tab-bar centre `+` navigate to `/flowers/new`; the card Edit action navigates to `/flowers/[id]/edit`. Those pages update the shared `'my-flowers'` cache (`useNuxtData`) in place so a save reflects here without a refetch.
- Inline stems-available quick-edit PATCHes `stemsAvailable` only, applied **optimistically** (reverts + toast on failure). Duplicate ("same flower, new colour") POSTs a copy without the derived bunch price. Archive soft-deletes optimistically.
- Client-side CSV export (prices in £, stock as words, UTF-8 BOM for Excel).

---

## `/flowers/new` (flowers/new.vue) & `/flowers/[id]/edit` (flowers/[id]/edit.vue)

Full-page add/edit forms (`layout: app`, middleware `['auth', 'onboarding']`, `robots: noindex`), grower-gated like `/flowers`. Both render `<FlowerForm>` inline. The edit page fetches the flower via `useRequestFetch()` against `GET /api/flowers/[id]` (cookie-forwarding; 404/403 handled by the endpoint). On `@saved` they patch the shared `'my-flowers'` cache (`useNuxtData`) and `navigateTo('/flowers')`; `@cancel` / the back chevron navigate back.

---

## `/invoices` (invoices/index.vue) & detail / new / edit

Grower invoicing (`layout: app`, middleware `['auth', 'onboarding']`, `robots: noindex`), grower-gated like `/flowers` (non-growers bounce to `/account`).

- **`/invoices`** — the list/table. Rows read like a table (customer + number/date on the left; total + `<InvoiceStatusBadge>` on the right) and link to the detail page. Shows total outstanding (unpaid). Loads `useFetch('/api/invoices', { key: 'my-invoices' })`; the new/edit pages patch that cache in place. Empty state links to create + invoice settings.
- **`/invoices/new`** & **`/invoices/[id]/edit`** — render `<InvoiceForm>` inline. They `Promise.all` the data the form needs via `useRequestFetch()` (settings, saved `customers`, `flowers` for the quick-add picker; the invoice too on edit). On `@saved` they update the `'my-invoices'` cache and navigate to the detail page.
- **`/invoices/[id]`** — a clean, **printable** invoice document plus owner actions (Print → `window.print()`, Edit, a Status dropdown that PATCHes `{ status }` optimistically, Delete with a confirm modal). App chrome + the action bar are hidden on print via `print:hidden` (the tab bar carries it too). The document renders the grower's `invoice-settings` as the "from" header + payment details, falling back to `profile.farmName` for the business name.

## `/account/invoice-settings` (account/invoice-settings.vue)

The grower's invoice "from" header, bank/payment details and numbering defaults (`layout: app`, grower-gated). Logo via `<ImageUploader>` (reverses `logoUrl` → R2 key on load); VAT entered as a percent and converted to basis points. Upserts via `PUT /api/invoice-settings`, then navigates to `/invoices`.

---

## `/blog` (blog/index.vue) & `/blog/:slug` (blog/[slug].vue)

PUBLIC marketing blog on the slim `default` chrome, powered by `@nuxt/content` v3 (markdown in `content/blog/*.md`, schema in `content.config.ts`). `blog/index.vue` lists posts (newest first) as borderless rows on hairline dividers, Stems-branded (EB Garamond headings, peach accents). `blog/[slug].vue` renders a post via `<ContentRenderer>` in a `max-w-3xl` prose column with `Article` + (when the post has `faq` frontmatter) `FAQPage` JSON-LD. **Drafts** (`draft: true`) are shown in dev (with a "Draft" pill) but hidden from the index, 404 in production, and excluded from the sitemap. Per-post `ogImage` falls back to the global `/og.png`.

## `/about`, `/policies`, `/privacy`, `/cookies` — public legal/marketing pages

Standalone, shareable web pages on the slim `default` chrome (Stems wordmark + sign-in), reachable from the discover-hero `About · Blog · Policies` nav. Entity for all legal copy is **Guardline Ltd** (England & Wales, company no. 13323382); contact `hello@stems.market`.

- `/about` — the longer story (the 6am DM pile, how it works, why local/seasonal, what Stems is not), grower-first, with a "List your flowers" / "Find a grower" CTA pair.
- `/policies` — small hub linking to the privacy + cookie policies; the home for legal pages as more get added (e.g. terms).
- `/privacy` — UK GDPR privacy policy, **Stems-specific**: magic-link auth (no passwords stored), public-by-design grower pages, and the deliberate no-in-app-messaging contact handoff (we don't see/send/store buyer↔grower conversations). Subprocessors: Stripe, Cloudflare (D1/R2), Resend. (No analytics currently — GA was removed.)
- `/cookies` — cookie table reflecting the **real**, functional-only cookies (`better-auth.session_token`, `stems_consent`, `stems_ref`). Copy states no analytics/marketing cookies are currently used. The "Change your preferences" button reuses the live consent system — `useConsent()` + `<LayoutConsentManageDialog>` (same dialog the banner opens), kept dormant and ready for a future provider (e.g. PostHog).

---

## `/account` (account/index.vue)

Owner's identity home (`layout: app`, middleware `['auth', 'onboarding']`). Avatar/initials, name, handle, location, bio; link to the public page; a grower row (open My Flowers, or "Start growing" which PATCHes `isGrower: true`); Edit profile + `<ShareButton>`; sign out (clears `useProfile` cache, navigates to `/login`). `await ensure()` before paint so `profile` is a row.

---

## `/account/edit` (account/edit.vue)

Owner-facing profile edit form (`layout: app`, middleware `['auth', 'onboarding']`). Avatar + banner via `<ImageUploader>`, about/links/contact fields, grower toggle. Handle is **read-only in V1** (renaming would break shared links). Client-side `validate()` mirrors the server guards for fast inline errors; saves via `PATCH /api/profile`, then `useProfile().set(updated)` and navigates back to `/account`. Unsaved-changes guard: a snapshot/`isDirty` diff drives an `onBeforeRouteLeave` confirm modal (and a `beforeunload` prompt) so edits aren't lost; a successful save (or "Discard") sets an `allowLeave` flag to bypass it.

---

## Learnings

- **No `useAsyncData`/`useFetch` auth gymnastics needed for public pages.** `/discover` and `/@handle` use `useFetch` directly because their endpoints are public (no auth header). For authed pages, data is loaded with `useFetch` too, but auth itself is resolved client-side via the Better Auth session (see the `auth` middleware).
- **Middleware order matters:** `['auth', 'onboarding']`. `auth` guarantees a session; `onboarding` then ensures a profile exists (redirecting to `/onboarding` if not). The `/onboarding` page lists both but the `onboarding` middleware special-cases it to avoid a loop.
- **Optimistic UI is the norm on `/flowers`** (stock changes, archive). Always capture the previous value and revert + toast on failure.
- **`robots: noindex,nofollow`** on every authed/owner page (`login`, `onboarding`, `flowers`, `account/*`). Public pages (`discover`, `@handle`) get full SEO meta.
- **Pages referenced but not yet built:** `/billing` + `/billing/success|cancel` (targeted by `useSubscription` and the `subscription` middleware) and `/settings` (linked from emails). The `subscription` and `admin` middleware exist but no page currently opts into them.
- **Global SEO baseline (`@nuxtjs/seo` sub-modules + `app.vue`).** `nuxt.config.ts` registers `@nuxtjs/sitemap`, `@nuxtjs/robots`, `nuxt-schema-org`, `nuxt-seo-utils`, `nuxt-site-config` by name (the `@nuxtjs/seo` umbrella is **deliberately not** used, so `nuxt-og-image` stays out — it crashes the Cloudflare dev preset; we ship a static `public/og.png` instead). `app.vue` sets the global OG fallback + `Organization`/`WebSite` JSON-LD; every public page inherits a `<title> · Stems` template, a canonical, and the OG image. Per-page `useSeoMeta` overrides win (last write), so `/@handle` keeps its dynamic OG + `LocalBusiness` schema. **Gotcha:** the title separator is `site.titleSeparator` (we set `'·'`); the `seo.titleTemplate` option does **not** apply here and the default separator is `'|'`. Per-page titles must therefore be brandless (`title: 'About'`, not `'About · Stems'`) to avoid doubling.
