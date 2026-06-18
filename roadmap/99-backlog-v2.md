# 99 — V2+ Backlog (parked, not lost)

Everything deliberately cut from V1 so it isn't forgotten. Roughly priority-ordered.
Don't build these without an explicit go — but design V1 so they slot in cleanly
(notes below flag where V1 already left room).

---

## Florist side
- **Florist role / account type.** V1 uses a single account with `isGrower`. A
  florist is just `isGrower = false` today. V2 adds florist-specific profile
  fields (business name, buying preferences) — add a `florist`-ish table or
  extend `profile`, don't overload `flower`.
- **Follow growers** — `follow (floristId, growerId)` table. Powers a feed.
- **Feed** — "what's new this week from growers you follow."
- **Saved favourites** — flowers/growers a florist bookmarks.

## Discovery & maps
- **Postcode radius search.** V1 already stores `postcode` + nullable
  `latitude`/`longitude` on `profile`. V2: geocode on save, query by bounding
  box / geodistance (or geohash). MapLibre map view.
- **Cross-grower flower filters** — filter by flower/colour/availability/length
  across all growers.
- **SQLite FTS5** for search at scale (see doc 09).
- **Regional landing pages** / SEO for "cut flowers in {region}".

## Transactions
- **Enquiry / message thread** (MVP messaging) — `thread`/`message` tables; opens
  a conversation, no payments.
- **In-app messaging** with notifications.
- **Orders / basket / checkout.**
- **Payments** — Stripe Connect for grower payouts. (Better Auth Stripe plugin +
  `subscription` table already in the repo if a grower **subscription** model is
  chosen instead of/alongside take-rate.)

## Grower power features
- **Reusable flower presets / library** — V1 approximates with Duplicate. A true
  preset table makes weekly updates a tap.
- **Weekly snapshot / publish + history** — the Cornish-Fleuria model, as an
  *option* layered over the live list (the rejected V1 alternative).
- **Multi-plot / multi-location growers** (Juliette has Bissoe + Mithian) — V1 is
  single freeform location; V2 = sites under one account.
- **Photo gallery per flower** — schema (`flower_photo`) already supports 1:N;
  V1 UI just manages the primary.
- **AI background removal / auto-enhance** on photos (probably overkill).

## Trust & social
- **Verified grower badges**, **reviews/ratings**.
- **Notifications** — new availability from followed growers, enquiry replies
  (the `EmailScheduler` DO + Resend plumbing already exists to build on; push via
  FCM/web-push later).

## Platform
- **Capacitor wrapper** (iOS/Android) — growers in the field. This is when
  **Apple/Google social sign-in** becomes worth adding (V1 is magic-link only;
  Apple sign-in is effectively required for the App Store).
- **Account deletion / data export** (GDPR) — not in V1.
- **Orphan image sweeper** — clean up R2 objects never attached to a row (doc 06).
- **Admin tooling** — repo has `requireAdmin`/admin endpoints to extend.

## Monetisation (open question, decide before V2 transactions)
Options on the table: free for both sides at launch; grower subscription;
take-rate once orders/payments land. The Stripe plumbing supports a subscription
model out of the box. Decide based on grower density + whether orders go in-app.
