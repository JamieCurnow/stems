# Nuxt + Cloudflare Stack — Integration Guides

A complete, production-grade starter stack for new Nuxt apps that need real auth, real billing, real email, real storage, and real background work — all on the Cloudflare edge.

This bundle is meant to be handed to an AI agent (or a careful human) who is setting up a brand-new template repository. It contains:

- **Prose guides** (`00-*` through `10-*`) explaining *why* each piece is wired the way it is.
- **Drop-in snippets** under `snippets/` — actual TypeScript / Vue / SQL / config files that can be copied into the new repo with minimal edits.

Everything has been genericised — no app names, brand colours, or product-specific tables. Wherever the original code referenced a specific app, the snippet uses one of these placeholders:

| Placeholder            | What it is                                                     |
| ---------------------- | -------------------------------------------------------------- |
| `Stems`         | Human-readable name (e.g. "Acme")                              |
| `stems`         | Kebab-case slug used for the worker name, D1 name, plan name   |
| `stems.market`       | Apex domain (e.g. `acme.com`)                                  |
| `stems_ref`   | Referral cookie name (e.g. `acme_ref`) — only needed if you keep referrals |
| `hello`  | Local part of the From address (e.g. `hello`)                  |
| `jamie@island-web.ca`      | Bootstrap admin email                                          |

A simple find/replace pass at the end of setup turns the template into a real app.

---

## The stack at a glance

| Layer        | Choice                                                   |
| ------------ | -------------------------------------------------------- |
| Framework    | Nuxt 4 (Vue 3 + Nitro)                                   |
| UI           | Nuxt UI v4 (Tailwind v4)                                 |
| Hosting      | Cloudflare Workers (`cloudflare-module` Nitro preset)    |
| Database     | Cloudflare D1 (SQLite) + Drizzle ORM                     |
| Auth         | Better Auth ≥ 1.6 with the Magic Link plugin             |
| Billing      | Stripe + `@better-auth/stripe`                           |
| Email        | Resend (SDK) — plain TS templates, not React Email       |
| Scheduling   | Cloudflare Durable Objects (one alarm per scheduled job) |
| File storage | Cloudflare R2 (auth-gated proxy with block caching)      |
| PWA          | `@vite-pwa/nuxt` + `@vite-pwa/assets-generator`          |
| Deployment   | GitHub Actions → `cloudflare/wrangler-action`            |

Everything except Stripe and Resend lives inside Cloudflare. One vendor for compute + state, two vendors for capabilities Cloudflare doesn't ship.

---

## Reading order

If you're standing this up from scratch, walk the guides in order:

1. [`00-overview.md`](./00-overview.md) — mental model and per-request binding pattern
2. [`01-cloudflare-setup.md`](./01-cloudflare-setup.md) — Nuxt + Nitro + wrangler + the DO wrapper
3. [`02-database-d1-drizzle.md`](./02-database-d1-drizzle.md) — D1 + Drizzle + migrations workflow
4. [`03-auth-better-auth.md`](./03-auth-better-auth.md) — Magic Link auth, sessions, middleware
5. [`04-stripe-billing.md`](./04-stripe-billing.md) — subscriptions, Checkout, Portal, webhooks, referrals
6. [`05-email-resend.md`](./05-email-resend.md) — templates, categories, preferences, suppression
7. [`06-durable-objects-scheduling.md`](./06-durable-objects-scheduling.md) — the EmailScheduler DO
8. [`07-r2-storage.md`](./07-r2-storage.md) — auth-gated R2 proxy with edge caching
9. [`08-pwa-setup.md`](./08-pwa-setup.md) — installable app, manifest, icons
10. [`09-deployment-cicd.md`](./09-deployment-cicd.md) — multi-env wrangler, GitHub Actions
11. [`10-gotchas.md`](./10-gotchas.md) — every footgun this stack has
12. [`11-analytics-gtm-ga4.md`](./11-analytics-gtm-ga4.md) — GTM + GA4, Consent Mode v2, server-side Measurement Protocol
13. [`12-cron-triggers.md`](./12-cron-triggers.md) — Cloudflare cron triggers, the `scheduled()` handler, signed-secret HTTP cron endpoints
14. [`13-local-dev.md`](./13-local-dev.md) — `.dev.vars`, local D1, `wrangler types`, when to use `nuxt dev` vs `wrangler dev`

Each guide ends with a "files to copy" pointer into `snippets/`.

---

## Pick-and-choose

The stack is designed so each layer can be dropped without breaking the rest:

- **Skip Stripe** — remove the `stripe` plugin from `auth.ts`, drop the `subscription` / `referral*` tables and the `/api/billing/*`, `/api/stripe/*`, `/r/[code]` endpoints. The rest still works.
- **Skip Email** — remove the Resend integration, the email templates, and the EmailScheduler DO. Magic Link still needs *some* way to deliver the link though — either re-enable email/password auth or wire up a different provider.
- **Skip R2** — just don't include the `FILES` binding or the auth-gated proxy. Nothing else depends on it.
- **Skip Durable Objects** — drop the `.cloudflare/worker.ts` wrapper and point `wrangler.main` back at `.output/server/index.mjs`. Lose scheduling but everything else keeps working. The `scheduleEmail` helper has a built-in D1-only fallback for this case (it's how local dev runs).

Auth + D1 are the floor — you'll want them no matter what.

---

## What this is NOT

- A working application. There is no UI scaffolding beyond a login page and middleware. Bring your own pages.
- A monorepo / package boundary. Everything is one Nuxt app. The "shared" folder is for code that crosses the SSR boundary, not for splitting into packages.
- An ORM debate. Drizzle is wired in because it has first-class D1 support and Better Auth accepts a raw `D1Database` so they coexist cleanly. Swap it for Kysely or raw SQL if you prefer — the request-scoped factory pattern in `server/utils/db.ts` is what matters.

---

## Conventions that matter

A few patterns are load-bearing across the stack. Internalise these before deviating:

1. **Cloudflare bindings are request-scoped, not module-scoped.** Every util (`useDb`, `useStripe`, `useResend`, `serverAuth`) is a function that takes an `H3Event` and pulls bindings from `event.context.cloudflare.env`. Never do `const auth = betterAuth(...)` at module load — the env doesn't exist there.

2. **Never read `process.env` in server code.** It's empty in the Workers runtime. Bindings + secrets all live on `event.context.cloudflare.env`. Local dev fills the same path from `.env` via Miniflare.

3. **`wrangler.jsonc` at the project root is the single source of truth** for Cloudflare config across dev / staging / production. Don't duplicate bindings into `nitro.cloudflare.wrangler` in `nuxt.config.ts` — set `nitro.cloudflare.deployConfig: false` and let wrangler own it.

4. **Migrations are forward-only, hand-rolled SQL.** Generated for Better Auth tables, hand-written for app tables. Both deploy workflows apply them automatically before the worker ships.

5. **Async Stripe everywhere.** `Stripe.createFetchHttpClient()` is mandatory; `stripe.webhooks.constructEventAsync(...)` instead of `constructEvent` (paired with `Stripe.createSubtleCryptoProvider()`). Workers don't have Node's `crypto`.
