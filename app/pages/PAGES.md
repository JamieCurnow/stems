# Pages

This file documents the pages in the app — route, purpose, layout, and any special logic. File-based routing: the directory structure maps to the route.

| File                | Route           | Layout    | Auth                               |
| ------------------- | --------------- | --------- | ---------------------------------- |
| `index.vue`         | `/`             | none      | public (redirects)                 |
| `discover.vue`      | `/discover`     | `app`     | public                             |
| `@[handle].vue`     | `/@:handle`     | `app`     | public                             |
| `login.vue`         | `/login`        | `default` | public                             |
| `onboarding.vue`    | `/onboarding`   | `default` | `auth`, `onboarding`               |
| `flowers.vue`       | `/flowers`      | `app`     | `auth`, `onboarding` (grower-only) |
| `account/index.vue` | `/account`      | `app`     | `auth`, `onboarding`               |
| `account/edit.vue`  | `/account/edit` | `app`     | `auth`, `onboarding`               |

---

## `/` (index.vue)

No standalone marketing home yet — `layout: false`, immediately `navigateTo('/discover', { redirectCode: 302 })`. The PWA `start_url` is `/discover`. _(A dedicated marketing landing is future work — flagged with a TODO in the file.)_

---

## `/discover` (discover.vue)

PUBLIC grower discovery — the app's main entry. Reachable logged-out; signed-in users see it under the `app` tab bar.

- Branded hero (name + slogan over a blurred floral wash). The "List your flowers" CTA is logged-out-only, gated on `session.isPending` to avoid flashing for signed-in users.
- Search box → `useFetch('/api/search', { query: { q: debouncedQ } })`. Term debounced ~250ms (`refDebounced`); empty term returns the recently-active browse list.
- Renders `<GrowerCard>` rows in a borderless feed; skeleton, "nothing matched" (with an invite-a-grower mailto), and "first blooms coming soon" empty states.

---

## `/@:handle` (@[handle].vue)

PUBLIC grower page — the shareable wedge. SSR-rendered so link previews (WhatsApp/iMessage/Instagram) resolve and availability is in the first paint.

- Fetches `/api/public/<bareHandle>` (the route param's leading `@` is stripped via `normaliseHandle`); throws a 404 page on miss.
- Hero (banner or blurred floral wash + avatar/initials, name, handle, location), bio, links, "Contact to buy" (opens `<ContactSheet>`), `<ShareButton>`, and an "Updated X ago" line from the freshest visible flower.
- Availability is a borderless feed; tapping a flower opens a read-only detail `UDrawer` (page-managed, not the card's editable events). Sold-out flowers are dimmed and sorted last (done server-side).
- Full `useSeoMeta` (OG/Twitter, absolute OG image resolved against the request origin) + JSON-LD (`LocalBusiness`/`Person`).

---

## `/login` (login.vue)

Magic-link sign-in (`layout: default`, `robots: noindex`). Email → `authClient.signIn.magicLink({ callbackURL, newUserCallbackURL: '/onboarding', errorCallbackURL })`. Returning users land on a safe `?redirect` path or `/account`; brand-new accounts always go to `/onboarding`. Shows a "check your inbox" confirmation, a referral-applied alert (`?ref=`), and a link-error alert (`?error=`).

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

## `/account` (account/index.vue)

Owner's identity home (`layout: app`, middleware `['auth', 'onboarding']`). Avatar/initials, name, handle, location, bio; link to the public page; a grower row (open My Flowers, or "Start growing" which PATCHes `isGrower: true`); Edit profile + `<ShareButton>`; sign out (clears `useProfile` cache, navigates to `/login`). `await ensure()` before paint so `profile` is a row.

---

## `/account/edit` (account/edit.vue)

Owner-facing profile edit form (`layout: app`, middleware `['auth', 'onboarding']`). Avatar + banner via `<ImageUploader>`, about/links/contact fields, grower toggle. Handle is **read-only in V1** (renaming would break shared links). Client-side `validate()` mirrors the server guards for fast inline errors; saves via `PATCH /api/profile`, then `useProfile().set(updated)` and navigates back to `/account`.

---

## Learnings

- **No `useAsyncData`/`useFetch` auth gymnastics needed for public pages.** `/discover` and `/@handle` use `useFetch` directly because their endpoints are public (no auth header). For authed pages, data is loaded with `useFetch` too, but auth itself is resolved client-side via the Better Auth session (see the `auth` middleware).
- **Middleware order matters:** `['auth', 'onboarding']`. `auth` guarantees a session; `onboarding` then ensures a profile exists (redirecting to `/onboarding` if not). The `/onboarding` page lists both but the `onboarding` middleware special-cases it to avoid a loop.
- **Optimistic UI is the norm on `/flowers`** (stock changes, archive). Always capture the previous value and revert + toast on failure.
- **`robots: noindex,nofollow`** on every authed/owner page (`login`, `onboarding`, `flowers`, `account/*`). Public pages (`discover`, `@handle`) get full SEO meta.
- **Pages referenced but not yet built:** `/billing` + `/billing/success|cancel` (targeted by `useSubscription` and the `subscription` middleware) and `/settings` (linked from emails). The `subscription` and `admin` middleware exist but no page currently opts into them.
