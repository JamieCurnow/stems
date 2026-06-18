# Nuxt 4 + Cloudflare Starter

Production-grade starter for Nuxt 4 apps running on Cloudflare Workers. Comes wired with auth, billing, transactional email, scheduled jobs, file storage, PWA, and CI/CD — all on the Cloudflare edge.

This README covers the day-one path: get the template running locally, then ship it.

---

## Setup

### 1. Use as template

Click **Use this template** on GitHub (or `git clone` and re-init), then:

```bash
cd your-new-app
```

### 2. Replace placeholders

Every file uses a fixed set of tokens that need real values. Run one `sed` pass:

```bash
# BSD/Mac sed
find . -type f \( -name '*.ts' -o -name '*.vue' -o -name '*.sql' -o -name '*.json' -o -name '*.jsonc' -o -name '*.yml' -o -name '*.md' -o -name '.env.example' \) \
  -not -path './node_modules/*' -not -path './.nuxt/*' -not -path './.output/*' \
  -exec sed -i '' \
    -e 's/Stems/Acme/g' \
    -e 's/stems/acme/g' \
    -e 's/stems.market/acme.com/g' \
    -e 's/stems_ref/acme_ref/g' \
    -e 's/hello/hello/g' \
    -e 's/jamie@island-web.ca/you@example.com/g' \
    {} +
```

GNU sed: drop the empty `''` after `-i`.

| Token                 | What it is                                            |
| --------------------- | ----------------------------------------------------- |
| `Stems`        | Human-readable name (e.g. `Acme`)                     |
| `stems`        | Kebab-case slug — worker name, D1 name, plan name     |
| `stems.market`      | Apex domain (e.g. `acme.com`)                         |
| `stems_ref`  | Referral cookie name. Drop if you don't use referrals |
| `hello` | Local part of the From address (e.g. `hello`)         |
| `jamie@island-web.ca`     | Bootstrap admin email                                 |

Two more placeholders live only in the analytics GTM container template
(`integration-guides/snippets/gtm-container-template.json`) and are filled by
hand when you import it — `{{CONTAINER_NAME}}` and `{{GA4_MEASUREMENT_ID}}`. See
`integration-guides/11-analytics-gtm-ga4.md`. The `sed` pass above leaves them
untouched (no replacement is defined for them).

### 3. Install dependencies

```bash
npm install
```

This also runs `nuxt prepare`, generating `.nuxt/tsconfig.json`.

### 4. Create the local D1 database

```bash
wrangler d1 create acme
```

Copy the printed `database_id` into `wrangler.jsonc` → top-level `d1_databases[0].database_id`. Apply migrations:

```bash
npm run db:migrate   # = wrangler d1 migrations apply acme --local
```

> Two separate local SQLite files live under `.wrangler/state/v3/d1/`, keyed by
> `database_id`: the **top-level** `DB` (`acme`) that `npm run dev` / `nuxt dev`
> reads, and the **`env.staging`** `DB` (`acme-staging`) that `npm run cf:dev`
> reads. They migrate independently — `db:migrate` targets the first,
> `cf:migrate` the second. If a handler throws `D1_ERROR: no such table` under
> one flow but not the other, the un-migrated DB is the culprit; migrations are
> idempotent, so re-running is a cheap no-op.

### 5. Local `.env`

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Required for sign-in to work:

- `BETTER_AUTH_SECRET` — `openssl rand -hex 32` (or `npx better-auth secret`)
- `BETTER_AUTH_URL=http://localhost:3000`
- `RESEND_API_KEY` — magic-link emails are sent via Resend
- `MAIL_FROM` — must use a Resend-verified domain
- `ADMIN_API_SECRET` — `openssl rand -hex 32`

Required if you keep Stripe billing:

- `STRIPE_SECRET_KEY` (test mode), `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_REFERRAL_WEBHOOK_SECRET`

Optional — analytics (everything no-ops cleanly when unset):

- `NUXT_PUBLIC_GTM_ID` — drives all client-side analytics via a single GTM container
- `NUXT_PUBLIC_GA4_MEASUREMENT_ID` + `GA4_API_SECRET` — used for server-side Measurement Protocol calls from Stripe webhooks and the referral landing

The values are read from `event.context.cloudflare.env` — never from `process.env` (it's empty in the Workers runtime). Miniflare reads `.env` into the same path automatically.

### 6. Run it

```bash
npm run dev
```

`npm run dev` applies any pending migrations to the local top-level D1
(`db:migrate`, idempotent) and then starts `nuxt dev`. App at
`http://localhost:3000`. To smoke-test the real production worker path
(`.cloudflare/worker.ts` wrapper + full Nitro bundle, with the `EmailScheduler`
DO bound) before deploying, use `npm run cf:dev` — it builds, migrates the
staging-local D1, and runs `wrangler dev --env staging`.

Quick wiring check:

```bash
curl localhost:3000/api/auth/get-session
# → {"data":null} when bindings are healthy
```

---

## Local dev — optional add-ons

### Stripe webhooks

Forward both webhook URLs to your dev server in a separate terminal:

```bash
stripe listen \
  --forward-to localhost:3000/api/auth/stripe/webhook \
  --forward-connect-to localhost:3000/api/stripe/webhook
```

Paste the printed `whsec_...` into `.env` as both `STRIPE_WEBHOOK_SECRET` and `STRIPE_REFERRAL_WEBHOOK_SECRET` (one CLI session, one secret across forwarded URLs).

### Scheduled email scheduler

The `EmailScheduler` Durable Object isn't bound in dev (the wrapper at `.cloudflare/worker.ts` is bypassed by Miniflare). `scheduleEmail` falls back to a D1-only queue. Drain it manually:

```bash
curl -X POST http://localhost:3000/api/cron/email-scheduler \
  -H "X-Admin-Secret: $ADMIN_API_SECRET"
```

### Send a test email

```bash
curl -X POST http://localhost:3000/api/admin/email-test \
  -H "X-Admin-Secret: $ADMIN_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "to": "you@example.com", "note": "smoke test" }'
```

---

## Deployment

Three environments — dev (local), staging, production. Each has its own worker, D1 database, and secret set. A staging session cannot authenticate against prod and vice versa.

### One-time Cloudflare setup

1. **Create an API token** — Cloudflare dashboard → My Profile → API Tokens → Create Token → Custom:
   - Account → Workers Scripts → Edit
   - Account → D1 → Edit
   - Account → Account Settings → Read
   - Zone → Workers Routes → Edit (if using custom domains)
2. **Get your account ID** — Cloudflare dashboard right sidebar.
3. **Disconnect any Cloudflare "Workers Builds" Git integration** — otherwise it races GitHub Actions.

### One-time GitHub setup

1. Repo Settings → Secrets and variables → Actions → New repository secret:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
2. Repo Settings → Secrets and variables → Actions → **Variables** → New variable:
   - `DEPLOY_ENABLED` = `true` — both deploy workflows are gated on this. Until
     it's set, pushes to `main` skip the staging deploy cleanly (green, not a
     failed run) so the un-provisioned template doesn't error on every push. Set
     it once staging/prod D1 + secrets exist.
3. Repo Settings → Environments → New environment:
   - `staging` — no protection rules
   - `production` — tick **Required reviewers** and add yourself

### Provision staging

```bash
# 1. Create the staging D1
wrangler d1 create acme-staging
# Paste the database_id into wrangler.jsonc → env.staging.d1_databases[0].database_id

# 2. Apply migrations
wrangler d1 migrations apply acme-staging --remote --env staging

# 3. Push secrets
echo -n "$(openssl rand -hex 32)" | wrangler secret put BETTER_AUTH_SECRET --env staging
echo -n "https://staging.acme.com" | wrangler secret put BETTER_AUTH_URL --env staging
echo -n "sk_test_..."              | wrangler secret put STRIPE_SECRET_KEY --env staging
echo -n "price_..."                | wrangler secret put STRIPE_PRICE_ID --env staging
echo -n "whsec_..."                | wrangler secret put STRIPE_WEBHOOK_SECRET --env staging
echo -n "whsec_..."                | wrangler secret put STRIPE_REFERRAL_WEBHOOK_SECRET --env staging
echo -n "re_..."                   | wrangler secret put RESEND_API_KEY --env staging
echo -n "$(openssl rand -hex 32)" | wrangler secret put ADMIN_API_SECRET --env staging
```

### Provision production

Same shape, swap `--env staging` for `--env production`, use **live** Stripe keys, and a separate auth secret. Webhook signing secrets are per-endpoint in production — create two webhook endpoints in the Stripe dashboard pointing at `/api/auth/stripe/webhook` and `/api/stripe/webhook` and use each endpoint's own signing secret.

### Day-to-day flow

- **Push to `main`** → `deploy-staging.yml` runs: build, apply migrations to staging D1, deploy worker.
- **Promote to prod** → GitHub Actions → "Deploy production" → Run workflow → approve in the Environments prompt.

### Rollback

```bash
# Code only (does not undo D1 migrations — those are forward-only)
wrangler rollback --env production
```

For broken migrations: forward-fix migration, or D1 Time Travel (point-in-time recovery up to ~30 days).

---

## Project layout

```
app/                      Vue app (auto-imported by Nuxt 4)
  composables/            useAuth, useSubscription
  middleware/             auth, subscription
  pages/                  Routed pages (only login.vue ships — see note below)
  utils/auth-client.ts    Better Auth Vue client
server/
  api/                    HTTP handlers
  routes/                 Public routes (/r/[code], /email/unsubscribe)
  db/
    schema.ts             Drizzle schema
    migrations/           Forward-only SQL
  durable-objects/        EmailScheduler
  emails/                 Plain-TS templates + registry
  utils/                  useDb, useStripe, useResend, requireUser, …
  types/cloudflare.d.ts   Bindings shape
shared/utils/             Code crossing the SSR boundary
.cloudflare/worker.ts     Wrangler entry — wraps Nitro output + DO exports
wrangler.jsonc            Cloudflare config (dev + staging + production)
DESIGN.md                 Brand & design guidelines (palette, type, layout)
```

> **Design system:** see [`DESIGN.md`](./DESIGN.md) for the brand direction,
> colour tokens, typography, and layout patterns. Read it before styling pages
> so the UI stays cohesive.

> **Heads-up:** the only page that ships is `app/pages/login.vue`. The auth and
> subscription middleware (and the login flow) redirect to `/app`,
> `/onboarding`, and `/billing*` — you create those pages. Until you do,
> post-login navigation 404s. That's intentional: the template wires the
> gates, not your product surface.

---

## What's included

### Cloudflare Workers + Nitro

Nuxt 4 with the `cloudflare-module` Nitro preset. `wrangler.jsonc` is the single source of truth for bindings, vars, and routes across all environments. Bindings are request-scoped (`event.context.cloudflare.env`), not module-scoped — every server util is a factory function.

### Auth — Better Auth + Magic Link

Passwordless sign-in. Sessions persisted in D1. No password hashes to leak. The `magicLink` plugin closes over the request event so email delivery has access to the per-request Resend binding.

- `/api/auth/[...all]` — Better Auth's full handler surface
- `app/middleware/auth.ts` — page-level gate
- `requireUser(event)` — server-side gate
- `app/pages/login.vue` — full sign-in flow with first-time onboarding split

### Database — D1 + Drizzle

Cloudflare D1 (SQLite) with Drizzle ORM. Forward-only hand-rolled SQL migrations under `server/db/migrations/`, applied automatically by both deploy workflows. Better Auth ≥ 1.6 takes a raw `D1Database` so the two coexist without an adapter shim.

### Billing — Stripe + Better Auth plugin

Two webhook endpoints. The Better Auth plugin owns subscription state (`/api/auth/stripe/webhook`); the custom endpoint (`/api/stripe/webhook`) does app-specific work like referral grants and post-payment emails. Stripe client uses `createFetchHttpClient()` + `createSubtleCryptoProvider()` (Workers have no Node `http` or `crypto`).

- Hosted Stripe Checkout via `authClient.subscription.upgrade(...)`
- Customer Portal at `/api/billing/portal`
- Subscription state queryable at `/api/billing/me`
- `app/middleware/subscription.ts` — gate `/app/**` to active subs

### Referrals (optional)

`/r/[code]` route drops a 30-day cookie, Checkout applies a matching Stripe Promotion Code, and an atomic CAS grant pattern credits the referrer's Stripe customer balance exactly once on the referee's first paid invoice. The CAS + Stripe idempotency key combo makes concurrent webhook retries safe.

### Email — Resend + categories + scheduling

Plain TypeScript templates (no React Email). Three categories — `transactional`, `product`, `marketing` — gated by per-user preferences and a global suppression list. One-click unsubscribe via `List-Unsubscribe` headers and a token-based public route.

- `sendEmail(event, ...)` — immediate
- `scheduleEmail(event, { sendAt, dedupeKey, ... })` — future-dated via the `EmailScheduler` Durable Object
- `cancelScheduledEmails({ dedupePrefix })` — bulk cancel by family (e.g. cancel all `trial-*` jobs when a trial converts)
- Resend webhook at `/api/resend/webhook` writes bounces/complaints into the suppression table

### EmailScheduler Durable Object

One DO instance per scheduled job, named by `dedupeKey`, with one alarm. Cloudflare runtime is the source of truth for _when_; D1 mirrors job status for admin inspection and prefix-based cancellation. Built-in retry-with-backoff capped at `MAX_ATTEMPTS = 5`. Dev mode falls back to a D1 queue drained by `/api/cron/email-scheduler`.

The pattern generalises — strip "email" from `EmailScheduler.ts` and you have a reusable "do this thing at a future timestamp" primitive.

### R2 — auth-gated proxy with block caching

`/api/files/[...path]` runs the auth check first, then serves bytes from R2. Cloudflare's edge cache can't store `206 Partial Content`, so the proxy caches fixed 1 MiB blocks as 200s and assembles them per-request. Range requests work, cache hits compound, and unauthed users never reach the cache layer.

### PWA — installable app

`@vite-pwa/nuxt` registers the service worker; `@vite-pwa/assets-generator` turns one source SVG into the full icon matrix (maskable + monochrome + apple + favicon). `start_url: '/app'` lands installs in the app, not the marketing home. Workbox runtime rules cache pages + images; API routes always go to the network.

Edit `public/App_icon_maskable.svg` then:

```bash
npm run generate-pwa-assets
```

### CI/CD — GitHub Actions

- `deploy-staging.yml` — push to `main` deploys staging automatically (build → migrations → worker).
- `deploy-production.yml` — manual dispatch with a Required-Reviewers gate. Fast-forwards a `releases/production` branch from `main`; refuses to deploy if prod has diverged.

### Analytics — GTM + GA4 + Consent Mode v2

A single Google Tag Manager container drives all client-side analytics. GA4 is configured _inside_ GTM (not loaded directly) so you can layer Meta / LinkedIn / Reddit pixels later without touching code. Consent Mode v2 defaults everything to denied; a first-party consent cookie (read on the very first SSR render) plus a bottom-sheet banner + manage dialog gives the user control.

- `app/plugins/analytics.client.ts` — boots dataLayer, pushes consent defaults, injects `gtm.js`
- `app/composables/useAnalytics.ts` — `track('event_name', { …params })`, `setUserId`, `setUserProperties`
- `app/composables/useAnalyticsIdentity.ts` — auto-syncs session + billing into the dataLayer
- `app/composables/useConsent.ts` + `app/components/Layout/CookieConsent.vue` + `ConsentManageDialog.vue` — banner, modal, cookie
- `server/utils/analytics.ts` — `sendServerEvent` over the GA4 Measurement Protocol. Already wired into the Stripe webhook (`purchase`, `trial_start`, `subscription_cancelled`, `subscription_reactivated`) and `/r/[code]` (`referral_landed` with hashed code).

The whole layer is opt-in: leave the env vars unset and it's a no-op end to end.

### Admin tooling

- `POST /api/admin/email-test` — send a one-shot test email
- `GET /api/admin/email-preview/<template>` — render a template inline in the browser with query-string props
- `POST /api/cron/email-scheduler` — drain the dev queue / re-poke stale jobs in prod

All gated behind `X-Admin-Secret: $ADMIN_API_SECRET`.

---

## Picking and choosing

Every layer above is independently removable. Auth + D1 are the floor; everything else is opt-in.

---

## Gotchas worth knowing up front

A few footguns that this template has already worked around — handy to know before debugging:

- **`compatibilityDate ≥ 2025-07-15`** is mandatory in `nuxt.config.ts`. Below it, Nitro's cloudflareDev preset silently falls back to a runtime that doesn't inject Cloudflare bindings — no warning logged.
- **`process.env` is empty in Workers.** Always read from `event.context.cloudflare.env`.
- **`worker-configuration.d.ts`** (the `wrangler types` output) is excluded from the TS program. Including it clobbers browser DOM types and breaks every `$fetch<T>()` call.
- **Durable Object bindings live only inside `env.<name>` blocks** in `wrangler.jsonc`, never at the top level — Miniflare can't find the class in dev.
- **`BETTER_AUTH_URL` mismatch** silently breaks session cookies. Match it to the actual served origin per environment.
- **Magic-link template must stay `transactional`** in `server/utils/emailCategory.ts` — otherwise an unsubscribed user can't sign in.

---

## Reference

- [`DESIGN.md`](./DESIGN.md) — Stems brand & design guidelines
- [Nuxt 4 docs](https://nuxt.com/docs)
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/)
- [Better Auth docs](https://better-auth.com/docs)
- [Drizzle ORM docs](https://orm.drizzle.team/docs/overview)
