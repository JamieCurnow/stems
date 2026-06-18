# 10 — Gotchas

Every footgun this stack has, collected so the next person doesn't re-discover them.

---

## Cloudflare / Nitro

### `compatibilityDate` must be ≥ `2025-07-15`

Nitro's `cloudflareDev` preset declares `compatibilityDate: 2025-07-15`. The preset resolver silently filters out any preset with a date *newer* than your `nuxt.config.ts` `compatibilityDate`, then falls back to a generic dev preset that doesn't inject Cloudflare bindings. **No warning is logged.**

Symptom: `event.context.cloudflare` is `undefined`, `event.context.cloudflare?.env?.DB` errors with "D1 binding DB not found", and you start questioning your life choices.

Fix: bump `compatibilityDate` in `nuxt.config.ts` to `'2025-07-15'` or later. Match it in `wrangler.jsonc`'s `compatibility_date`.

### Use `'cloudflare-module'`, not `'cloudflare_module'`

Nitro 2.13+ ships both `cloudflare-module` and `cloudflare-module-legacy` with overlapping aliases. Kebab-case is the unambiguous current preset.

### `wrangler.jsonc` at the project root is required for local dev

Nitro's cloudflareDev plugin scans for `wrangler.json | wrangler.jsonc | wrangler.toml` at startup to know which bindings to expose. As long as the file exists at the root, the **top-level** bindings are what dev sees (env-scoped blocks under `env:` are only used by `wrangler deploy --env <name>`).

> Earlier versions of this setup duplicated bindings into both `wrangler.jsonc` and `nitro.cloudflare.wrangler` in `nuxt.config.ts`. Don't do that — set `nitro.cloudflare.deployConfig: false` and let `wrangler.jsonc` be the single source of truth.

### `process.env` is empty in the Workers runtime

Cloudflare Workers don't have `process.env`. In dev it works (Nitro polyfills it from `.env`); in prod it's silently `undefined` and Better Auth throws on first cookie sign.

**Always read secrets from `event.context.cloudflare.env`** — that's the same path in dev (Miniflare reads `.env` into it) and prod (Cloudflare injects worker secrets there).

### Don't commit `.wrangler/`

Local D1 state, KV state, deploy artefacts. Already in `.gitignore` in the template; double-check when starting a new project.

### `wrangler types` output leaks Workers globals into the browser TS program

`wrangler types` writes a gitignored `worker-configuration.d.ts` at the project root containing the **full Cloudflare Workers ambient runtime types** (`declare function fetch`, workerd `RequestInit`, etc.). Nuxt's generated tsconfig includes `../*.d.ts`, so without an exclude those globals leak into the browser/app program and clobber the DOM + ofetch types that `$fetch<T>()` depends on — every `$fetch<T>` then fails with TS2558.

Fix in `nuxt.config.ts`:

```ts
typescript: {
  tsConfig: {
    exclude: ['../worker-configuration.d.ts']
  }
}
```

Server code is typed via the hand-maintained `server/types/cloudflare.d.ts` plus explicit `@cloudflare/workers-types` imports — `worker-configuration.d.ts` is unnecessary.

---

## Better Auth

### CLI version drift

`better-auth@1.6.x` requires `@better-auth/cli@1.5.0-beta.x` because the latest stable CLI ships an older `better-call` peer that's missing exports the new core needs. If `npx better-auth generate` fails with `does not provide an export named 'kAPIErrorHeaderSymbol'`, install the beta:

```bash
npm i -D @better-auth/cli@beta
```

Re-check this every time you bump `better-auth` itself.

### Schema regeneration needs a CLI-only stub config

The CLI imports your config statically to compute the schema. It can't import the runtime `auth.ts` because that calls a per-request function and references `D1Database` types from Workers. The stub `auth.cli.ts` swaps in `better-sqlite3 :memory:` so the CLI can read the schema. **Keep both files' option blocks identical.**

The CLI emits the **entire schema**, not a diff. After running `better-auth generate`, manually trim the file down to a forward diff (delete the `CREATE TABLE` statements for tables that already exist).

### `BETTER_AUTH_URL` mismatch silently breaks sessions

Better Auth derives the cookie domain and CSRF origin checks from `BETTER_AUTH_URL`. If it's wrong (`http://localhost` in prod, or a subdomain mismatch), sign-in succeeds but the cookie isn't accepted on subsequent requests — sessions appear to "not stick."

Debug "I just signed in but `useSession` returns null"? Check this first.

### `authClient.useSession(useFetch)` caches across navigations

`useFetch` dedupes by URL, so after a client-side sign-in the auth middleware can read the stale "logged out" SSR response cached during the original render and bounce the user back. Use `useRequestFetch()` instead (event-bound on SSR, plain `$fetch` on client) — it doesn't share the SSR cache.

This bit us once. The middleware files in `snippets/` carry the explanation as a comment so the next reader doesn't strip the workaround thinking it's redundant.

### Magic Link callback URLs are picked by user state

`callbackURL` is for returning users, `newUserCallbackURL` is for accounts that were just created on verify. Better Auth picks automatically. If your onboarding funnel lives at `/onboarding`, set `newUserCallbackURL: '/onboarding'` — you don't need to detect "first sign-in" yourself.

---

## Stripe

### `Stripe.createFetchHttpClient()` is mandatory

Without it, the SDK tries to use Node's `http` and crashes at runtime in the Worker. Set on every Stripe client construction. The `useStripe(event)` factory does this for you — use the factory, don't construct Stripe clients ad-hoc.

### `constructEventAsync`, not `constructEvent`

Workers don't have Node `crypto`. Webhook signature verification requires `stripe.webhooks.constructEventAsync(body, sig, secret, undefined, stripeCryptoProvider)` where `stripeCryptoProvider = Stripe.createSubtleCryptoProvider()`. The sync form throws.

### `Invoice.subscription` moved in API v2026-04-22 (dahlia)

It's now at `invoice.parent.subscription_details.subscription`. Same for the `subscription` field on a few other resources. When bumping the SDK, search for `.subscription` on Invoice-derived objects.

### `PromotionCodeCreateParams` shape changed

It's now `{ promotion: { type: 'coupon', coupon: '...' } }`, not `{ coupon: '...' }`. Centralise promotion code creation (e.g. via a `referrals.ts` helper) so there's one place to update.

### `onSubscriptionCreated` is never called if `onSubscriptionComplete` already ran

Better Auth's stripe plugin processes `checkout.session.completed` first — that's when `onSubscriptionComplete` fires and the subscription row is created. By the time `customer.subscription.created` arrives, the row exists and the plugin short-circuits, never calling `onSubscriptionCreated`. See `@better-auth/stripe/dist/index.mjs:254-257` for the early return.

If you want a hook on "first checkout success" — use `onSubscriptionComplete`. Don't rely on `onSubscriptionCreated`.

### Stripe CLI dev listener signing secret is per-session

The `stripe listen` secret is stable across runs as long as you use the same CLI auth — but if you rotate the CLI auth (or run from a fresh machine) you'll get a new secret and need to re-paste it into `.env`. One CLI listener has **one** signing secret across forwarded URLs, so dev uses the same secret for `STRIPE_WEBHOOK_SECRET` and `STRIPE_REFERRAL_WEBHOOK_SECRET`. In deployed envs each webhook endpoint has its own.

### `getCheckoutSessionParams` reads cookies from the Better Auth request

The plugin forwards your auth-cookie jar as part of the upgrade call, so referral cookies set by `/r/[code]` land at the same origin and are visible there. If you ever split auth and app onto different origins, referral discounts will silently stop working.

### Staging behind basic auth needs route exceptions for Stripe webhooks

Stripe doesn't send HTTP Basic credentials. If your staging worker sits behind a basic-auth gate at `staging.{{APP_DOMAIN}}/*`, every webhook POST 401s before reaching your worker. Add concrete-path routes that bypass the gate:

```jsonc
"routes": [
  { "pattern": "staging.{{APP_DOMAIN}}", "custom_domain": true },
  { "pattern": "staging.{{APP_DOMAIN}}/api/auth/stripe/webhook", "zone_name": "{{APP_DOMAIN}}" },
  { "pattern": "staging.{{APP_DOMAIN}}/api/stripe/webhook",      "zone_name": "{{APP_DOMAIN}}" }
]
```

Cloudflare picks the most specific matching route per request. Webhook signature verification is the real security boundary on those paths.

---

## Email / Resend

### `@react-email/render` is an undocumented peer of `resend`

Install it even though you don't use React Email — the bundler fails on `npm run build` otherwise.

### `MAIL_FROM` must use a verified Resend domain

Until the domain's SPF/DKIM/DMARC records are verified in Resend, every send 4xxs. Easy to forget when bootstrapping a new env. Bootstrap order: add domain in Resend → DNS records → wait for green → set `MAIL_FROM` → try a test send.

### Audience check happens at send time inside the DO, not at schedule time

A user who unsubscribes between scheduling and firing must still have their wishes honoured. The DO calls `canSendEmail` inside `alarm()` — don't move it earlier.

### A login link is `transactional`

If you accidentally categorise the magic-link template as `marketing`, an unsubscribed user can't sign in. The category map in `server/utils/emailCategory.ts` is the single source of truth — read it whenever you add a new template.

---

## Durable Objects

### `durable_objects` and `migrations` only in env blocks, not at the top level

The DO wrapper (`.cloudflare/worker.ts`) is only used by `wrangler deploy`. In `nuxt dev`, Miniflare runs the Nitro bundle directly without the wrapper, so if you declare DOs at the top level Miniflare errors on a missing class.

Declare DOs inside `env.staging` / `env.production` only. Dev gets the D1-only fallback.

### Migration tags are Cloudflare-side, separate from D1 migrations

The DO class migration (`{ "tag": "v1", "new_sqlite_classes": ["EmailScheduler"] }`) is applied by `wrangler deploy` and registers the class with the Cloudflare runtime. It's completely separate from the SQL files in `server/db/migrations/`, which are applied by `wrangler d1 migrations apply`. They live in different config blocks and use different mechanisms.

### `wrangler.main` must point at the wrapper, not at the Nitro output

Pointing it back at `.output/server/index.mjs` removes the DO class export from the deploy bundle. Worker still deploys, but the DO binding silently fails to resolve at runtime.

### DO id strings are case-sensitive 64-hex chars

When you persist a DO id from `state.id.toString()`, don't lowercase/uppercase it. Don't compare loosely.

### Local dev has no DO. Use the catch-up runner.

`scheduleEmail` writes to the audit table and skips the DO dispatch in dev. To exercise the send:

```bash
curl -X POST http://localhost:3000/api/cron/email-scheduler \
  -H "X-Admin-Secret: $ADMIN_API_SECRET"
```

---

## R2 + caching

### `caches.default` is undefined in Miniflare

Local dev bypasses the edge cache. The auth-gated proxy guards `caches?.default` for this reason. Don't assume cache hits in dev.

### `206 Partial Content` cannot be cached by Cloudflare's edge

That's why the block-aligned caching pattern exists. If you try to cache the response itself, you get nothing. Cache **fixed-size blocks** as 200s, assemble per-request.

### `remote: true` on dev R2 binding proxies to real R2

Read-mostly buckets benefit (`nuxt dev` just works against prod data). Mutable user-data buckets do not (you'll mutate prod from local). Choose per binding.

---

## Errors

### `createError` is the only way to fail an H3 handler safely

Inside a `defineEventHandler`, **throw `createError({ statusCode, statusMessage })`** instead of throwing a raw `Error`. H3 inspects the thrown value: a `createError` result becomes a clean JSON response with the right status; a raw `Error` becomes a 500 with the message buried.

```ts
// good
if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })

// bad — surfaces as a generic 500 with leaked stack trace in dev
if (!user) throw new Error('Unauthenticated')
```

Treat `statusMessage` as user-facing — it lands in the error page and serialises into the JSON body. Don't put internal details there.

### Anything thrown after a `setHeader('content-type', …)` becomes a content-type lie

If you've already written response headers (e.g. streaming SSE, returning PMTiles bytes), throwing mid-handler still gets H3's error response — but the headers you set are still on the wire, so the client sees `Content-Type: application/octet-stream` followed by JSON. Either validate up front before you set headers, or catch internally and write a typed error byte stream.

### `error.vue` is the catch-all error page, not a 404 page

A top-level `app/error.vue` (Nuxt convention) handles **any unrecoverable error** that bubbles up — 404, 500, asset-load failure, hydration mismatch. Read `error.statusCode` inside and branch the UI. Don't try to render the normal app shell here — `error.vue` mounts outside `<NuxtPage />`, so layouts, header, footer, etc. won't render unless you build them in.

```vue
<!-- app/error.vue -->
<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; message: string } }>()
const heading = computed(() => (props.error.statusCode === 404 ? 'Not found' : 'Something went wrong'))
</script>

<template>
  <UApp>
    <main class="grid min-h-screen place-items-center p-8 text-center">
      <div>
        <p class="text-sm text-neutral-500">{{ error.statusCode }}</p>
        <h1 class="mt-2 text-2xl font-semibold">{{ heading }}</h1>
        <UButton class="mt-6" to="/" @click="clearError({ redirect: '/' })">Back home</UButton>
      </div>
    </main>
  </UApp>
</template>
```

Call `clearError({ redirect: '/' })` to dismount the error page — without it, internal links from the error page just re-error.

### 4xx vs 5xx — pick the bucket, don't shrug

Conflating the two breaks logging and alerts. Quick rule:

- **4xx** = "the caller gave us something we can't act on" — don't alert; do count, you may want to spot abuse patterns.
- **5xx** = "we screwed up or a dependency did" — alert; this is your pager surface.

A common slip: returning 500 when the user just isn't signed in (should be 401), or 200 + `{ ok: false }` when the resource doesn't exist (should be 404). Use the status code as the primary signal so dashboards work without parsing bodies.

### Never echo a Stripe / Resend / Better Auth error body to the user

Third-party error messages can include internal IDs, customer references, and sometimes whole webhook payloads. Catch the third-party error, log the full thing server-side, and surface a sanitised `statusMessage` to the user:

```ts
try {
  await stripe.checkout.sessions.create(params)
} catch (err) {
  console.error('[stripe] checkout create failed', err)
  throw createError({ statusCode: 502, statusMessage: 'Checkout temporarily unavailable' })
}
```

`502` is the right code when a dependency failed (you're a gateway in front of Stripe). `500` implies the bug is yours.

### Workers Logs catch `console.error` — use it

`observability.logs.enabled = true` in `wrangler.jsonc` makes every `console.*` call queryable from the dashboard. **Log the unexpected, not the expected.** Logging every `requireUser` 401 is noise; logging the catch in your Stripe webhook is signal.

Stream live with `wrangler tail --env production --format pretty`.

---

## Misc

### Don't put markdown files inside Nuxt's auto-scan paths without ignoring them

Catalog docs (`COMPONENTS.md`, etc.) that live alongside source code under `app/` or `server/` will be picked up by Nuxt's auto-importers and Nitro's unimport scanner. Configure:

```ts
// nuxt.config.ts
{
  ignore: ['**/*.md'],
  nitro: {
    ignore: ['**/*.md'],
    imports: { dirs: ['!**/*.md'] }   // also keeps unimport out
  }
}
```

### Markdown ignore propagates to `eslint`

If you add new doc files inside source dirs and ESLint complains, check that `eslint.config.mjs` ignores `**/*.md` too.

### D1's "no such function: …" SQL errors

D1 is SQLite, not Postgres. Some functions don't exist (`NOW()`, `gen_random_uuid()`, full date arithmetic). For random ids use `crypto.randomUUID()` in JS, not in SQL. For "now" use `CURRENT_TIMESTAMP` or pass `Date.now()` from the app.

### Drizzle's `like()` helper isn't available without sql template tags

For prefix matches over D1 via Drizzle, either use `sql\`column LIKE ${pattern}\`` or pull rows in JS and filter. Cheap at small N; reconsider once you're scanning ten-thousand-plus rows per call.
