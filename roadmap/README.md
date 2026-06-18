# Stems — Roadmap

**The marketplace for local-grown flowers.**

A two-sided platform for small-scale UK flower growers and the florists who buy
from them. Growers maintain a live availability list with photos; their profile
lives at a shareable `@handle` URL. This roadmap covers **V1** only — the
shareable-link wedge — and parks everything else in [`99-backlog-v2.md`](./99-backlog-v2.md).

---

## V1 in one sentence

> Create an account, claim an `@username`, set up a grower profile/about page,
> list your flowers with photos + live availability, and share one clean link —
> and let anyone search for and browse growers without signing in.

### What V1 includes
- Account creation via **magic link** (already wired into the repo).
- Onboarding: claim a unique `@handle`, set farm name + location, flip the
  **"I grow flowers"** (`isGrower`) toggle.
- Grower profile / **about page** (bio, location, Instagram, avatar, banner).
- **Flower listings** with full info (name, variety, colour, stem length, stems
  per bunch, price per stem, auto bunch price, availability status, notes) and
  **photos**.
- **Live availability**: listings are continuously editable; the public page
  shows current state + "Updated 2 days ago". No weekly publish cycle.
- **Public profile + availability page** at `stems.app/@handle` — viewable
  logged-out. This is the wedge.
- **User search / discovery** by handle, farm name, and location text.
- **Share link** (copy + Web Share API). PDF/Instagram export is optional polish.
- Clean, **mobile-first, app-like** UI (PWA) themed in the Stems brand.

### What V1 explicitly defers → [`99-backlog-v2.md`](./99-backlog-v2.md)
Florist accounts as a distinct role, follow/feed, in-app messaging, push
notifications, payments/Stripe Connect, postcode radius search, multi-plot
growers, reviews/verification, weekly snapshot/publish, Capacitor mobile wrap.

---

## Locked decisions (from scoping)

| Decision | Choice | Why |
|---|---|---|
| Account model | **Single account; `isGrower` is a profile flag** | No role-picker friction; anyone can become a grower later. Florist role is V2. |
| Logged-out access | **Profiles, availability, and search are fully public** | The shareable link is the growth wedge. Auth only gates *editing*. |
| Availability model | **Continuous live list + "updated" timestamp** | Lowest friction, always-on, app-like. Simpler data model than weekly snapshots. |
| Photos | **Client-side square crop → upload to public R2 → serve via `/img`** | Solves photo standardisation with zero external image cost. |
| Auth | **Magic-link email only** (existing) | Zero passwords; good for non-technical growers. Social/Apple deferred to the Capacitor build. |
| Profile URL | **`stems.app/@handle`** | Social convention; maximally shareable. |
| Money | **Stored as integer pence** | Avoids float drift. Formatting util in `shared/`. |

---

## The actual stack (this repo)

> ⚠️ The original handoff doc said *Firebase*. **Ignore that.** This repo is the
> Cloudflare stack. All docs here target it.

- **Frontend**: Nuxt 4, Vue 3, TypeScript, **Nuxt UI 4** (+ Reka UI), **Tailwind v4**, Pinia, VueUse.
- **Runtime**: Cloudflare Workers (Nitro `cloudflare-module` preset).
- **DB**: Cloudflare **D1** + **Drizzle ORM**. Schema in `server/db/schema.ts`, hand-rolled SQL migrations in `server/db/migrations/`.
- **Auth**: **Better Auth** (magic link), session-cookie based. `serverAuth(event)` / `requireUser(event)`.
- **Storage**: Cloudflare **R2** (currently an auth-gated streaming proxy example; V1 adds a public image path).
- **Realtime/background**: Durable Objects (an `EmailScheduler` DO exists).
- **Email**: **Resend** + templated emails in `server/emails/`.
- **Billing**: Stripe + Better Auth Stripe plugin (present, **not used in V1**).
- **PWA**: `@vite-pwa/nuxt` (installable, offline page cache, image cache).

---

## How to use these docs (for agents)

1. **Read [`00-conventions.md`](./00-conventions.md) first, every time.** It is the
   contract: how to talk to D1, auth a request, generate IDs, name migrations,
   format money, and which patterns are off-limits (e.g. never write Better Auth
   tables via Drizzle).
2. **Read [`02-data-model.md`](./02-data-model.md)** — it is the single source of
   truth for every V1 table, enum, and shared util. Do not invent column names;
   use the ones defined there.
3. Build features in the order below. Each feature doc is self-contained: goal,
   user stories, data touched, API surface, pages/components (with file paths),
   UX notes, out-of-scope, and a definition-of-done checklist.
4. When a doc and the live repo disagree, **trust the repo's patterns** and flag
   the drift in your PR description.

---

## Build order (dependency-aware)

| # | Doc | Depends on | Ships |
|---|---|---|---|
| 00 | [Conventions](./00-conventions.md) | — | contract only |
| 01 | [Design system & theme](./01-design-system.md) | — | brand tokens, `main.css`, `app.config.ts`, base components |
| 02 | [Data model](./02-data-model.md) | — | Drizzle schema + migrations + shared enums/utils |
| 03 | [App shell & navigation](./03-app-shell-navigation.md) | 01 | layouts, mobile tab bar, PWA polish |
| 04 | [Auth & onboarding](./04-auth-onboarding.md) | 02, 03 | login (exists), onboarding, `@handle` claim, `isGrower` |
| 05 | [Grower profile & about page](./05-grower-profile.md) | 04, 06 | profile edit + public about content |
| 06 | [Image pipeline](./06-image-pipeline.md) | 02 | public R2 bucket, client crop, upload API, `/img` route |
| 07 | [Flower listings](./07-flower-listings.md) | 05, 06 | flower CRUD, "My flowers" manager |
| 08 | [Public profile & availability](./08-public-profile-availability.md) | 05, 07 | `/@handle` public page + share |
| 09 | [User search & discovery](./09-user-search-discovery.md) | 05 | search by handle/farm/location |
| 10 | [Share & export](./10-share-export.md) | 08 | copy link, Web Share; PDF optional |
| 99 | [V2 backlog](./99-backlog-v2.md) | — | parked scope |

**Suggested critical path to a usable wedge:** 01 → 02 → 03 → 04 → 06 → 05 → 07
→ 08. Search (09) and share polish (10) can land in parallel once 05/08 exist.

---

## Definition of "V1 done"

A grower can, on their phone: sign in via magic link → claim `@juliette` →
fill in their about page with an avatar → add 10 flowers with square photos,
prices and availability → and send `stems.app/@juliette` to a florist who opens
it (no login) and sees the live, nicely-formatted availability list. A visitor
can search "Cornwall" and find Juliette. The whole thing feels like a native app.
