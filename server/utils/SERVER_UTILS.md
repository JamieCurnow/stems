# Server Utilities

Server-side utilities in `server/utils/` (auto-imported into Nitro handlers). This is a Cloudflare Workers app: **bindings and secrets are request-scoped** (`event.context.cloudflare.env`), so most of these are `use*(event)` factories built per request, not module-level singletons. Never reach for `process.env` — it's empty in the Workers runtime.

---

## Database

### `useDb(event)` — `db.ts`

Build a Drizzle client bound to the request's D1 binding (`env.DB`). Throws 500 if the binding is missing. Returns `Db` (`DrizzleD1Database<typeof schema>`).

```ts
const db = useDb(event)
const row = await db.select().from(profile).where(eq(profile.userId, user.id)).get()
```

---

## Auth & access control

### `serverAuth(event)` — `auth.ts`

Build a Better Auth instance from the request-scoped D1 binding. Magic-link only (`emailAndPassword` disabled). The Stripe plugin loads **only when `STRIPE_SECRET_KEY` is set** (so dev works before billing is configured). Captures the referral cookie at signup and wires referral reward hooks. Returns the Better Auth instance; `/api/auth/[...all].ts` forwards to `auth.handler`.

### `requireUser(event)` — `requireUser.ts`

Resolve the current user from the Better Auth session cookie. **Throws 401 if unauthenticated.** Call at the top of every authenticated endpoint.

```ts
const user = await requireUser(event)
```

### `requireActiveSubscription(event)` — `requireActiveSubscription.ts`

`requireUser` + verify an `active`/`trialing` subscription on the configured `PLAN_SLUG`. Throws 401 if signed out, **402** if signed in but unsubscribed (matches Stripe's "Payment Required" so the frontend can route to `/billing`). Returns `{ user, subscription }`. Exports `ACTIVE_STATUSES`.

### `requireAdmin(event)` — `requireAdmin.ts`

Header/secret gate for **machine** endpoints (cron, internal pokes). Checks `X-Admin-Secret` header (or `?secret=`) against `ADMIN_API_SECRET`. Throws 500 if the secret isn't configured, 401 on mismatch.

### `requireAdminUser(event)` — `requireAdminUser.ts`

Session-**or**-secret gate for admin endpoints hit by both the UI and scripts. Secret path returns `{ user: null, via: 'secret' }`; session path requires an email on the allow-list (`DEFAULT_ADMIN_EMAILS` + `ADMIN_EMAILS` env) and returns `{ user, via: 'session' }`. There's no role column — admin is an email allow-list.

### `auth.cli.ts`

CLI-only Better Auth instance for `@better-auth/cli generate` (uses an in-memory SQLite DB + dummy Stripe client). Keep its options in lock-step with `auth.ts` or the generated migration drifts. Not used at runtime.

---

## Validation

### `readZodBody(event, schema)` — `validation.ts`

Validate the JSON body against a Zod schema. Throws **400** with a readable `path: message` on failure; returns the fully-typed parsed value.

```ts
const { name } = await readZodBody(event, z.object({ name: z.string() }))
```

### `getZodQuery(event, schema)` — `validation.ts`

Same, for the query string.

### `getSafeRouterParam(event, name)` — `validation.ts`

Read a required router param, throwing 400 if missing/empty.

```ts
const id = getSafeRouterParam(event, 'id')
```

### `profileSchemas.ts`

Shared Zod schemas for the profile endpoints: `profileCreateSchema` (onboarding — requires handle + farmName) and `profilePatchSchema` (edit — `.partial()`, so only present keys are touched). Houses the bespoke field rules (handle via `validateHandle`, Instagram, website, WhatsApp, contact email).

### Flower schemas — `server/api/flowers/index.post.ts`

`flowerCreateSchema` / `flowerPatchSchema` (and `toFlowerDto`, `loadPhotoKeys`) are exported from the create handler and reused by the other flower routes.

---

## Images & storage (R2)

### `imgUrl(key)` — `img.ts`

Turn a stored R2 key (`public/abc.webp`) into a public URL (`/img/abc.webp`) the client can drop into `<img src>`. Null-safe (null/empty → `null`). API handlers run keys through this when building DTOs so the client never sees raw keys.

> Uploads go to the `FILES` R2 bucket via `POST /api/uploads`. Public images are served by `server/routes/img/[...path].get.ts` (`/img/*`, no auth, immutable cache); the auth-gated block-cached proxy is `server/api/files/[...path].get.ts`.

---

## Stripe

### `useStripe(event)` — `stripe.ts`

Build a Stripe SDK client wired for Workers: `createFetchHttpClient()` (no Node `http`) — pair webhook verification with `constructEventAsync`, never `constructEvent`. Throws 500 if `STRIPE_SECRET_KEY` is unset.

### `stripeCryptoProvider` — `stripe.ts`

`Stripe.createSubtleCryptoProvider()` — pass to `constructEventAsync` for webhook signature verification (Workers have SubtleCrypto, not Node `crypto`).

### `referrals.ts`

Referral lifecycle helpers (all take `db` + `stripe`): `generateReferralCode`, `ensureUserHasReferralCode` (idempotent code + Stripe Promotion Code), `recordReferralRedemption`, `grantReferrerReward` (credits the referrer's balance once a referee pays a non-trial invoice; idempotent via Stripe idempotency key + an atomic CAS on `rewardGrantedAt`, capped by `REFERRAL_REWARD_CAP`).

---

## Email (Resend + scheduling)

### `resend.ts`

`useResend(event)` (request-scoped Resend client, throws 500 without `RESEND_API_KEY`), `mailFrom(event)` (the verified `From`), `publicBaseUrl(event)` (absolute base for links in emails; `PUBLIC_BASE_URL` env, else request origin).

### `email.ts`

The send/preferences/scheduling layer:

- `ensureEmailPreferences(db, userId)` — idempotently provision the prefs row (with an unsubscribe token).
- `isSuppressed(db, email)` / `canSendEmail({ db, email, category, userId?, leadId? })` — audience gate. Transactional always sends past prefs (but never past suppression).
- `sendEmail(event, { emailId, to, props, ... })` — render + send immediately via Resend (throws on failure). Does **not** run the audience check — call `canSendEmail` first for non-transactional sends.
- `scheduleEmail(event, { emailId, sendAt, props, dedupeKey?, ... })` — schedule via the `EmailScheduler` Durable Object (one DO per email, keyed by `dedupeKey`), mirroring an audit row into D1. Falls back to D1-only when the DO binding is absent (dev).
- `cancelScheduledEmail` / `cancelScheduledEmails` — cancel by id, or by `dedupeKey`/`dedupePrefix`/`userId`/`leadId` on a state change.
- `runScheduledEmailQueue(event)` — the cron drainer. DO-bound: re-pokes overdue audit rows (DO dedupes). DO-unbound (dev): sends due rows directly. Called by `POST /api/cron/email-scheduler`.

### `emailCategory.ts`

`EMAIL_CATEGORY: Record<EmailId, 'transactional' | 'product' | 'marketing'>` — the single source of truth for which preference gates each template. A login link MUST be `transactional` or an unsubscribed user can't sign in.

---

## Analytics

### `sendServerEvent(event, { name, userId?, params? })` — `analytics.ts`

Server-side GA4 Measurement Protocol (used from Stripe webhooks, referral redirects). Synthesises a deterministic `client_id` from the user id so server events stitch to browser events; flags hits as non-personalised. **Soft-fails** (quiet no-op) when the measurement id / api secret is missing — analytics must never block billing or auth.

---

## Learnings

- **Everything DB/auth/Stripe/Resend is `use*(event)` / `*(event)`, built per request** because Cloudflare bindings don't exist at module load. There is no `useMongoDb`, no `useServerAuth`/`useServerAuthWithError`, no `getDocData`, no `serverError`, no `paginatedMongoQuery` — those were Firebase/Mongo-stack utils and do not exist here.
- **Errors use H3's `createError({ statusCode, statusMessage })`**, thrown directly. There's no `serverError()` helper. `statusMessage` is surfaced to the client, so write it for humans.
- **Auth uses Better Auth + the session cookie**, not Firebase ID tokens / bearer headers. `requireUser(event)` reads `auth.api.getSession({ headers })`.
- **R2 keys never reach the client** — always map through `imgUrl()` when building a DTO.
- **Stripe in Workers:** always `constructEventAsync` + `stripeCryptoProvider`; the SDK client must use `createFetchHttpClient()`.
- **The DO is the source of truth for scheduled email; D1 is a best-effort mirror.** In `nuxt dev` the DO binding is absent (Miniflare runs the Nitro bundle without the wrapper), so scheduling falls back to D1 + the cron runner.
