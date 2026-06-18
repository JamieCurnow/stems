# Server Endpoints

API endpoints (`server/api/*`) and public routes (`server/routes/*`). File-based routing with a method suffix: `server/api/flowers/index.get.ts` → `GET /api/flowers`. Routes under `server/routes/` map to the URL root (no `/api` prefix).

**Auth** column legend: `user` = `requireUser` (session, 401); `sub` = `requireActiveSubscription` (402 if unsubscribed); `admin-secret` = `requireAdmin` (`X-Admin-Secret`); `admin` = `requireAdminUser` (session allow-list **or** secret); `public` = none; `webhook` = signature-verified.

| Method + path                         | Auth           | Body / query validation                  |
| ------------------------------------- | -------------- | ---------------------------------------- |
| `GET /api/flowers`                    | user           | `?archived=1`                            |
| `POST /api/flowers`                   | user           | `flowerCreateSchema`                     |
| `GET /api/flowers/[id]`               | user           | —                                        |
| `PATCH /api/flowers/[id]`             | user           | `flowerPatchSchema`                      |
| `DELETE /api/flowers/[id]`            | user           | —                                        |
| `PATCH /api/flowers/reorder`          | user           | `{ ids: string[] }`                      |
| `GET /api/profile/me`                 | user           | —                                        |
| `POST /api/profile`                   | user           | `profileCreateSchema`                    |
| `PATCH /api/profile`                  | user           | `profilePatchSchema`                     |
| `GET /api/profile/handle-available`   | user           | `?handle`                                |
| `GET /api/public/[handle]`            | public         | —                                        |
| `GET /api/search`                     | public         | `?q&limit&cursor` (clamped)              |
| `POST /api/uploads`                   | user           | multipart/raw image                      |
| `GET /api/files/[...path]`            | user           | Range header                             |
| `GET /api/billing/me`                 | user           | —                                        |
| `POST /api/billing/portal`            | user           | —                                        |
| `GET /api/email/preferences`          | user           | —                                        |
| `PUT /api/email/preferences`          | user           | `{ marketingEnabled?, productEnabled? }` |
| `GET /api/admin/me`                   | admin          | —                                        |
| `POST /api/admin/email-test`          | admin-secret   | `{ to, note? }`                          |
| `GET /api/admin/email-preview/[name]` | admin-secret   | query props                              |
| `POST /api/cron/email-scheduler`      | admin-secret   | —                                        |
| `POST /api/stripe/webhook`            | webhook        | Stripe signature                         |
| `POST /api/resend/webhook`            | webhook (Svix) | Resend signature                         |
| `/api/auth/**`                        | (Better Auth)  | —                                        |
| `GET /r/[code]`                       | public         | —                                        |
| `GET /img/[...path]`                  | public         | —                                        |
| `GET /email/unsubscribe`              | public         | `?token`/`?email`&`category`             |

---

## Flowers — `/api/flowers`

### `GET /api/flowers`

The signed-in grower's flowers. Non-archived by default; `?archived=1` includes archived. One `leftJoin` onto `flower_photo` (no N+1), grouped in JS; photo keys → `/img` URLs (primary first). Ordered `sortOrder asc, updatedAt desc`.

- **Auth:** user · **Response:** `FlowerDto[]`

### `POST /api/flowers`

Create a flower. Validated by `flowerCreateSchema`. `id = crypto.randomUUID()`, `sortOrder = max+1` for the grower, attaches `photoKeys` → `flower_photo` rows.

- **Auth:** user · **Body:** flower fields (`name` required; prices in pence; `photoKeys` must each start with `public/`) · **Response:** `FlowerDto`

### `GET /api/flowers/[id]`

A single flower owned by the grower. 404 if missing, 403 if someone else's.

- **Auth:** user · **Response:** `FlowerDto`

### `PATCH /api/flowers/[id]`

Partial update — only the keys present in the body are touched (`flowerPatchSchema` is `.partial()`), which is how the high-frequency inline stock update works. `updatedAt` **always** bumps (drives the public "Updated X ago"). If `photoKeys` is present, the photo set is replaced. 403 on others' flowers.

- **Auth:** user · **Body:** any subset of flower fields · **Response:** `FlowerDto`

### `DELETE /api/flowers/[id]`

Soft-delete (`isArchived = true`); keeps the row + photos (hard delete is V2). Bumps `updatedAt`.

- **Auth:** user · **Response:** `{ ok: true }`

### `PATCH /api/flowers/reorder`

Assign `sortOrder` by array index. Every id must belong to the grower (403 otherwise). `updatedAt` intentionally **not** bumped (reordering isn't a content edit).

- **Auth:** user · **Body:** `{ ids: string[] }` · **Response:** `{ ok: true }`

---

## Profile — `/api/profile`

### `GET /api/profile/me`

The signed-in user's profile row, or `null` if not yet onboarded (the onboarding gate keys off this).

- **Auth:** user · **Response:** `ProfileRow | null`

### `POST /api/profile`

Create the profile during onboarding (PK is `userId`, one per user). Validated by `profileCreateSchema`. Re-checks handle availability before insert, and treats a UNIQUE/PK violation as **409**.

- **Auth:** user · **Body:** `{ handle, farmName, locationName?, postcode?, isGrower? }` · **Response:** `ProfileRow` · **Errors:** 409 (already has a profile / handle taken)

### `PATCH /api/profile`

Partial update (`profilePatchSchema`, `.partial()`). Handle is **not** editable in V1. Unknown keys are stripped; a key set to `null` clears the column; `updatedAt` bumps. Returns the row unchanged if no recognised fields.

- **Auth:** user · **Body:** any subset of editable profile fields · **Response:** `ProfileRow`

### `GET /api/profile/handle-available`

Live availability check for onboarding. Auth-gated to limit enumeration. Format/reserved problems → `{ available: false, error }`; an already-taken handle → `{ available: false }` (no error).

- **Auth:** user · **Query:** `handle` · **Response:** `{ available: boolean, error?: string }`

---

## Public — discovery & profile pages

### `GET /api/public/[handle]`

PUBLIC grower-page payload — must work logged-out so link previews + first paint render server-side. No private fields (no postcode/email/lat-lng); R2 keys → `/img` URLs; prices resolved. Sold-out flowers pushed last. Short edge cache (`max-age=30, s-maxage=60, swr=60`). 404 if no such handle.

- **Auth:** public · **Response:** `{ profile: PublicProfileDto, flowers: FlowerDto[] }`

### `GET /api/search`

PUBLIC grower discovery (powers `/discover`). Empty `q` → recently-active browse list; with a term → case-insensitive substring match over handle/farmName/location, ranked (exact handle > prefix > farmName > location), then most-recently-active. One `LEFT JOIN` + `GROUP BY` for counts/last-active (no N+1). `limit`/`cursor` are parsed and **clamped** (never 400). _Scale note: `LIKE '%term%'` is a full scan — fine at launch; move to FTS5 when growth demands._

- **Auth:** public · **Query:** `q?`, `limit?` (≤50, default 20), `cursor?` (offset) · **Response:** `GrowerCardDto[]`

---

## Uploads & file serving (R2)

### `POST /api/uploads`

Authenticated image upload. Accepts an already-cropped image as `multipart/form-data` (`file` field) or a raw body with an `image/webp|jpeg|png` Content-Type. Stores under `public/<uuid>.<ext>` in the `FILES` R2 bucket. 5 MB cap.

- **Auth:** user · **Response:** `{ key: string }` · **Errors:** 400 (bad type/empty), 413 (too large)

### `GET /api/files/[...path]`

Auth-gated R2 proxy with block-aligned (1 MiB) edge caching and `Range`/206 support. Auth runs **before** any cache lookup so unauthed users can't bypass it. Only serves keys matching `<slug>.<ext>`.

- **Auth:** user · **Response:** image bytes (200/206)

> Public images are served by `GET /img/[...path]` (below), not this endpoint.

---

## Billing — `/api/billing`

### `GET /api/billing/me`

The user's subscription summary so the frontend can route without an extra Stripe round-trip. Treats `cancel_at` or `cancel_at_period_end` as "pending cancel".

- **Auth:** user · **Response:** `{ hasSubscription, isActive, status, periodEnd, trialEnd, cancelAtPeriodEnd, cancelAt, pendingCancel }`

### `POST /api/billing/portal`

Create a Stripe Customer Portal session (change card, cancel, invoices, promo codes) and return the URL. 400 if the user has no Stripe customer yet.

- **Auth:** user · **Response:** `{ url: string }`

---

## Email preferences — `/api/email`

### `GET /api/email/preferences`

Read the user's per-category email prefs (lazily creates the row + unsubscribe token).

- **Auth:** user · **Response:** `{ marketingEnabled, productEnabled, transactionalEnabled }`

### `PUT /api/email/preferences`

Update `marketingEnabled` / `productEnabled`. `transactionalEnabled` is intentionally **not** editable (receipts, cancellation confirmations, sign-in links always send).

- **Auth:** user · **Body:** `{ marketingEnabled?: boolean, productEnabled?: boolean }` · **Response:** the full prefs object

---

## Admin — `/api/admin`

### `GET /api/admin/me`

Returns `{ user, via }` — used by the client `admin` middleware to gate admin pages.

- **Auth:** admin (session allow-list or secret)

### `POST /api/admin/email-test`

Send a test email via Resend.

- **Auth:** admin-secret · **Body:** `{ to: string, note?: string }` · **Response:** `{ ok, resendId }`

### `GET /api/admin/email-preview/[name]`

Render a template to HTML in the browser. Non-`secret` query keys become props (JSON-parsed when possible). 404 for an unknown template name.

- **Auth:** admin-secret · **Response:** `text/html`

---

## Cron — `/api/cron`

### `POST /api/cron/email-scheduler`

Drains the `scheduledEmail` queue (`runScheduledEmailQueue`). Fired every minute by the Cloudflare Cron Trigger (`wrangler.jsonc` → `triggers.crons`), forwarded from `scheduled()` in `.cloudflare/worker.ts`. DO-bound: re-pokes overdue rows. DO-unbound (dev): sends directly.

- **Auth:** admin-secret · **Response:** `{ ok, ...result }`

---

## Webhooks

### `POST /api/stripe/webhook`

App-specific Stripe side-effects (Better Auth's Stripe plugin owns `/api/auth/stripe/webhook` for core subscription state). Verifies with `constructEventAsync` + `stripeCryptoProvider` against `STRIPE_REFERRAL_WEBHOOK_SECRET`. Handles `invoice.paid` (subscription_cycle → credit referrer + GA4 `purchase`), `customer.subscription.created` (trialing → `trial_start`), and subscription updated/deleted (cancellation / reactivation events).

- **Auth:** Stripe signature · **Response:** `{ received: true, ... }`

### `POST /api/resend/webhook`

Listens for `email.bounced` / `email.complained` and writes the recipient into `emailSuppression`. Verifies the **Svix** signature (`svix-id/timestamp/signature`) over `${id}.${timestamp}.${body}` with a 5-minute replay window when `RESEND_WEBHOOK_SECRET` is set (skipped in dev). Configure in Resend → `https://stems.market/api/resend/webhook`.

- **Auth:** Svix signature · **Response:** `{ received: true, ... }`

### `/api/auth/**` — `[...all].ts`

Catch-all forwarding every `/api/auth/*` request to Better Auth: magic-link sign-in/verify, `get-session`, and (with the Stripe plugin) `stripe/webhook`, `subscription/upgrade`, etc.

---

## Public routes (`server/routes/*`, no `/api` prefix)

### `GET /r/[code]`

Referral landing redirect. Validates the code, drops a 30-day `stems_ref` cookie, fires a hashed `referral_landed` GA4 event, then 302s to `/login?ref=CODE`.

### `GET /img/[...path]`

PUBLIC image serve from the `FILES` R2 bucket under `public/`, immutable 1-year cache, edge-cached (guarded for Miniflare in dev). Rejects path traversal — can only ever read keys under `public/`. Keys are content-unique UUIDs so `immutable` is safe.

### `GET /email/unsubscribe`

Public, no-login, one-click unsubscribe (GDPR). `?token=` resolves to a user's prefs (flips the `category` boolean) or a lead (suppresses by email); `?email=` suppresses by address. Returns a small confirmation HTML page.

---

## Learnings

- **Auth is the first line of every protected handler** — `requireUser` (401), `requireActiveSubscription` (402), `requireAdmin`/`requireAdminUser` for admin. Session-based (Better Auth cookie), not bearer tokens.
- **Validate with the Zod helpers, not hand-rolled coercion:** `readZodBody` / `getZodQuery` / `getSafeRouterParam` (`server/utils/validation.ts`). Shared schemas live alongside their domain (`flowerCreateSchema`/`flowerPatchSchema` in `flowers/index.post.ts`; `profileCreateSchema`/`profilePatchSchema` in `server/utils/profileSchemas.ts`). PATCH schemas are `.partial()` so absent keys are never touched while an explicit `null` still clears a column.
- **Public endpoints must render logged-out** (`/api/public/[handle]`, `/api/search`, `/img`, `/r`, `/email/unsubscribe`) — they power SSR link previews and GDPR/referral flows. Keep them free of `requireUser`.
- **Webhooks read the raw body** (`readRawBody`) and verify signatures before doing anything — verification gates writes to the suppression list / subscription state. Never `readBody` a webhook (it'd break signature verification).
- **R2 keys → `/img` URLs in every DTO** via `imgUrl()`; the client never sees raw keys, and writes only ever happen through `/api/uploads` under the `public/` prefix.
- **Errors are `createError({ statusCode, statusMessage })`.** `statusMessage` is surfaced to the client (the frontend reads `e.statusMessage`), so phrase it for humans.
