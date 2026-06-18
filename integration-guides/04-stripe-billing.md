# 04 — Stripe Subscriptions + Billing

Hosted Stripe Checkout, Stripe Customer Portal, and an optional referral system. Driven by Better Auth's official Stripe plugin (`@better-auth/stripe`), which means new signups get a Stripe Customer row automatically and subscription state is synced into D1 by Better Auth's own webhook.

---

## Install

```bash
npm i @better-auth/stripe stripe
```

---

## Two webhooks, not one

Better Auth's Stripe plugin owns `POST /api/auth/stripe/webhook` and handles the core subscription state (status, periodEnd, cancelAtPeriodEnd, trial timestamps). You don't write that handler — it's part of the plugin.

For anything beyond raw subscription state — referral credits, post-payment emails, GA conversions — write your own handler at `POST /api/stripe/webhook`. It listens for a smaller set of events (typically `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`) and does app-specific work.

| Endpoint                       | Owned by    | Events it cares about                                                                                                     |
| ------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/stripe/webhook`| Plugin      | `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_succeeded` |
| `POST /api/stripe/webhook`     | You         | `invoice.paid` (post-payment side-effects), `customer.subscription.updated/deleted` (cancellation flows), `customer.subscription.created` (trial conversions) |

Two webhook secrets: `STRIPE_WEBHOOK_SECRET` for the plugin endpoint, `STRIPE_REFERRAL_WEBHOOK_SECRET` (or whatever you name it) for your endpoint. **Each Stripe webhook endpoint has its own signing secret** — in local dev the Stripe CLI listener uses one secret across both URLs, but in deployed envs they're separate.

---

## `server/utils/stripe.ts`

```ts
import Stripe from 'stripe'
import type { H3Event } from 'h3'

export function useStripe(event: H3Event): Stripe {
  const env = event.context.cloudflare?.env
  if (!env?.STRIPE_SECRET_KEY) {
    throw createError({ statusCode: 500, statusMessage: 'STRIPE_SECRET_KEY not set' })
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),  // ← mandatory on Workers (no Node http)
    typescript: true
  })
}

// Paired with stripe.webhooks.constructEventAsync (NOT constructEvent — Workers have no Node crypto)
export const stripeCryptoProvider = Stripe.createSubtleCryptoProvider()
```

Without `createFetchHttpClient()` the SDK tries to use Node's `http` and crashes at runtime in the Worker. Without `createSubtleCryptoProvider()` paired with `constructEventAsync`, webhook signature verification throws because Workers don't have Node `crypto`. Both are mandatory.

---

## Adding the plugin to Better Auth

In `server/utils/auth.ts`, alongside `magicLink()`:

```ts
import { stripe as stripePlugin } from '@better-auth/stripe'
import Stripe from 'stripe'

// inside serverAuth(event):
const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
  typescript: true
})

const options: BetterAuthOptions = {
  // ...
  plugins: [
    magicLink({ ... }),
    stripePlugin({
      stripeClient,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: 'stems',           // the plan slug used by client.subscription.upgrade()
            priceId: env.STRIPE_PRICE_ID,
            freeTrial: { days: 7 }          // optional
          }
        ],
        // Customise the Stripe Checkout session — referral discounts, tax, address collection
        getCheckoutSessionParams: async (_data, req) => {
          // See snippets/server/utils/auth.ts for the full referral-aware impl
          return {
            params: {
              automatic_tax: { enabled: true },
              billing_address_collection: 'auto',
              tax_id_collection: { enabled: false },
              allow_promotion_codes: true
            }
          }
        },
        onSubscriptionComplete: async ({ subscription, stripeSubscription }) => {
          // Fires at checkout.session.completed. Hook in:
          //   - referral redemption recording
          //   - onboarding email triggers
          //   - GA conversion ping
        }
      }
    })
  ]
}
```

The plugin's `onSubscriptionComplete` callback fires **before** `customer.subscription.created`. By the time the latter arrives, the subscription row already exists and the plugin short-circuits, never calling `onSubscriptionCreated`. So if you want a hook on "first checkout success", use `onSubscriptionComplete`.

Mirror the plugin block in `server/utils/auth.cli.ts` with dummy values so the CLI can generate the schema.

---

## Migration

The plugin's `0003_stripe.sql` adds `stripeCustomerId` to `user` and creates the `subscription` table:

```sql
ALTER TABLE "user" ADD COLUMN "stripeCustomerId" text;

CREATE TABLE "subscription" (
  "id" text NOT NULL PRIMARY KEY,
  "plan" text NOT NULL,
  "referenceId" text NOT NULL,
  "stripeCustomerId" text,
  "stripeSubscriptionId" text,
  "status" text NOT NULL,
  "periodStart" date,
  "periodEnd" date,
  "trialStart" date,
  "trialEnd" date,
  "cancelAtPeriodEnd" integer,
  "cancelAt" date,
  "canceledAt" date,
  "endedAt" date,
  "seats" integer,
  "billingInterval" text,
  "stripeScheduleId" text
);

CREATE INDEX "subscription_referenceId_idx" ON "subscription" ("referenceId");
CREATE INDEX "subscription_stripeSubscriptionId_idx" ON "subscription" ("stripeSubscriptionId");
```

Generated by `better-auth generate` against the CLI stub, then trimmed to a forward diff.

---

## The Vue client

`app/utils/auth-client.ts`:

```ts
import { createAuthClient } from 'better-auth/vue'
import { magicLinkClient } from 'better-auth/client/plugins'
import { stripeClient } from '@better-auth/stripe/client'

export const authClient = createAuthClient({
  plugins: [
    magicLinkClient(),
    stripeClient({ subscription: true })   // ← exposes authClient.subscription.upgrade(...)
  ]
})

export const { signIn, signOut, useSession } = authClient
```

Then from a Vue component / composable:

```ts
const { data, error } = await authClient.subscription.upgrade({
  plan: 'stems',
  successUrl: '/billing/success',
  cancelUrl: '/billing/cancel'
})
if (error) throw new Error(error.message ?? 'Checkout failed')
if (data && 'url' in data && typeof data.url === 'string') {
  window.location.href = data.url
}
```

This redirects to Stripe-hosted Checkout. The user pays, gets bounced back, your `billing/success` page polls `/api/billing/me` until the subscription row appears (Better Auth's webhook upserts it), then forwards to wherever logged-in users land.

---

## Reading subscription state

`server/api/billing/me.get.ts` — your frontend's source of truth for the user's billing state:

```ts
import { and, eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import * as schema from '~~/server/db/schema'

const ACTIVE_STATUSES = ['active', 'trialing'] as const

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)

  const sub = await db.query.subscription.findFirst({
    where: and(
      eq(schema.subscription.referenceId, user.id),
      eq(schema.subscription.plan, 'stems')
    )
  })

  // Mid-trial cancels set `cancel_at` (timestamp), paid cancels set `cancel_at_period_end: true`
  const cancelAt = sub?.cancelAt ?? null
  const cancelAtPeriodEnd = !!sub?.cancelAtPeriodEnd
  return {
    hasSubscription: !!sub,
    isActive: !!sub && (ACTIVE_STATUSES as readonly string[]).includes(sub.status),
    status: sub?.status ?? null,
    periodEnd: sub?.periodEnd ?? null,
    trialEnd: sub?.trialEnd ?? null,
    cancelAtPeriodEnd,
    cancelAt,
    pendingCancel: cancelAtPeriodEnd || !!cancelAt
  }
})
```

Pair it with a route middleware so any `/app/**` page bounces unsubscribed users to `/billing`:

```ts
// app/middleware/subscription.ts
type Session = { user?: { id: string } } | null

export default defineNuxtRouteMiddleware(async (to) => {
  const fetcher = useRequestFetch()
  const session = await fetcher<Session>('/api/auth/get-session')

  if (!session?.user) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
  if (to.path.startsWith('/billing')) return     // don't loop on /billing itself

  try {
    const status = await fetcher<{ isActive: boolean }>('/api/billing/me')
    if (!status.isActive) {
      return navigateTo({ path: '/billing', query: { reason: 'inactive' } })
    }
  } catch {
    return navigateTo({ path: '/billing', query: { reason: 'error' } })
  }
})
```

---

## Customer Portal

`server/api/billing/portal.post.ts`:

```ts
import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { useStripe } from '~~/server/utils/stripe'
import * as schema from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)
  const stripe = useStripe(event)

  const userRow = await db.query.user.findFirst({ where: eq(schema.user.id, user.id) })
  const customerId = (userRow as { stripeCustomerId?: string } | undefined)?.stripeCustomerId
  if (!customerId) {
    throw createError({ statusCode: 400, statusMessage: 'No Stripe customer for this user' })
  }

  const origin = getRequestURL(event).origin
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/billing`
  })
  return { url: session.url }
})
```

The Portal is configured in the Stripe Dashboard (which features it shows: change card, cancel, download invoices, redeem promo codes mid-cycle). Default config is fine for most apps.

---

## Custom webhook (`/api/stripe/webhook`)

This is where you wire app-specific side effects. The skeleton:

```ts
import type Stripe from 'stripe'
import { useStripe, stripeCryptoProvider } from '~~/server/utils/stripe'

export default defineEventHandler(async (event) => {
  const env = event.context.cloudflare?.env
  if (!env) throw createError({ statusCode: 500, statusMessage: 'No cloudflare env' })

  const signature = getHeader(event, 'stripe-signature')
  if (!signature) throw createError({ statusCode: 400, statusMessage: 'Missing stripe-signature' })

  const rawBody = await readRawBody(event, false)
  if (!rawBody) throw createError({ statusCode: 400, statusMessage: 'Empty body' })
  const bodyString = typeof rawBody === 'string' ? rawBody : new TextDecoder().decode(rawBody)

  const stripe = useStripe(event)
  let stripeEvent: Stripe.Event
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(
      bodyString,
      signature,
      env.STRIPE_REFERRAL_WEBHOOK_SECRET,
      undefined,
      stripeCryptoProvider
    )
  } catch (err) {
    throw createError({ statusCode: 400, statusMessage: `Sig fail: ${(err as Error).message}` })
  }

  if (stripeEvent.type === 'invoice.paid') {
    const invoice = stripeEvent.data.object as Stripe.Invoice
    if (invoice.billing_reason !== 'subscription_cycle') return { received: true, skipped: true }

    // Stripe API v2026-04-22 (dahlia) moved Invoice.subscription to:
    const parentSub = invoice.parent?.subscription_details?.subscription
    const subId = typeof parentSub === 'string' ? parentSub : parentSub?.id
    // ... do post-payment work
  }

  return { received: true }
})
```

Two API-version footguns burnt into the comments here so you don't relearn them.

---

## Optional: referral system

If you keep this, four moving parts:

1. **`/r/[code]` route** (`server/routes/r/[code].get.ts`) — drops a 30-day cookie carrying the referrer's code, redirects to `/login?ref=CODE`. (`server/routes/` paths are public — they sit at the URL root, not under `/api/`.)

2. **`getCheckoutSessionParams` hook** — reads the cookie, looks up the matching Stripe Promotion Code, and attaches it to the Checkout session via `discounts: [{ promotion_code: promo.id }]`.

3. **`onSubscriptionComplete` hook** — calls `ensureUserHasReferralCode` (idempotent — issues a code + a Stripe Promotion Code for the new subscriber so they can refer others) and `recordReferralRedemption` (logs that this user used the cookie's code).

4. **Custom webhook `invoice.paid` handler** — when a referee's first non-trial invoice clears (`billing_reason === 'subscription_cycle'`), calls `grantReferrerReward` which credits the referrer's Stripe customer balance with one free month, up to a lifetime cap.

The full implementation is in `snippets/server/utils/referrals.ts`. The interesting bit is the idempotency: `grantReferrerReward` uses an **atomic CAS** (`update WHERE rewardGrantedAt IS NULL ... RETURNING id`) plus a Stripe `idempotencyKey` keyed on the redemption row id. Concurrent webhook retries can't double-credit because:

- Stripe dedupes the balance transaction by idempotency key.
- Only the writer that flips `rewardGrantedAt` from NULL is allowed to bump the referrer's lifetime counter. Concurrent invocations see 0 affected rows and skip the increment.

This pattern shows up wherever you have webhook handlers that must be exactly-once. Worth internalising.

---

## Local dev

```bash
# 1. .env populated with STRIPE_SECRET_KEY (test mode), STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET.
# 2. Start the dev server.
npm run dev

# 3. In another terminal — forward Stripe events to BOTH webhook endpoints:
stripe listen \
  --forward-to localhost:3000/api/auth/stripe/webhook \
  --forward-connect-to localhost:3000/api/stripe/webhook
```

The Stripe CLI prints a `whsec_...` secret on startup — paste it into `.env` as `STRIPE_WEBHOOK_SECRET` and `STRIPE_REFERRAL_WEBHOOK_SECRET`. The same secret signs both URLs in dev (one CLI listener has one signing secret per session). In deployed envs each endpoint has its own.

Test card: `4242 4242 4242 4242` with any future expiry / 3-digit CVC / 5-digit ZIP.

---

## Production cutover

```bash
# 1. Switch CLI to your live account
stripe login

# 2. Create product, price, (optional) referral coupon, webhook endpoints
stripe products create --name="Stems" -d "metadata[slug]=stems" --live
stripe prices create --product=prod_... --currency=usd --unit-amount=2000 \
  -d "recurring[interval]=month" --live

# 3. Create both webhook endpoints — Stripe shows the signing secret ONCE per endpoint
stripe webhook_endpoints create \
  --url=https://stems.market/api/auth/stripe/webhook \
  -d "enabled_events[]=checkout.session.completed" \
  -d "enabled_events[]=customer.subscription.created" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted" \
  -d "enabled_events[]=customer.subscription.trial_will_end" \
  -d "enabled_events[]=invoice.payment_succeeded" \
  -d "enabled_events[]=invoice.payment_failed" \
  -d "enabled_events[]=invoice.paid" --live

stripe webhook_endpoints create \
  --url=https://stems.market/api/stripe/webhook \
  -d "enabled_events[]=invoice.paid" \
  -d "enabled_events[]=customer.subscription.created" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted" --live

# 4. Push live values to wrangler
echo -n '<live_sk>'       | npx wrangler secret put STRIPE_SECRET_KEY --env production
echo -n '<live_price>'    | npx wrangler secret put STRIPE_PRICE_ID --env production
echo -n '<auth_whsec>'    | npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
echo -n '<custom_whsec>'  | npx wrangler secret put STRIPE_REFERRAL_WEBHOOK_SECRET --env production
```

---

## Webhook routing on staging (if staging is behind basic auth)

If your staging worker sits behind a separate Cloudflare Worker doing HTTP Basic Auth on `staging.stems.market/*`, Stripe webhooks will 401 — Stripe doesn't send Basic credentials.

The fix is two extra Cloudflare Worker routes pointing the webhook paths at the app worker directly:

```jsonc
"routes": [
  { "pattern": "staging.stems.market", "custom_domain": true },
  { "pattern": "staging.stems.market/api/auth/stripe/webhook", "zone_name": "stems.market" },
  { "pattern": "staging.stems.market/api/stripe/webhook",      "zone_name": "stems.market" }
]
```

Cloudflare picks the most specific matching route per request, so concrete paths beat `/*`. The webhook signature verification is the real security boundary on those paths — anyone hitting them without a valid Stripe-Signature gets a 400.

---

## Gotchas

- **`Stripe.createFetchHttpClient()`** on every Stripe construction — Workers lack Node's `http`.
- **`stripe.webhooks.constructEventAsync(...)` with `stripeCryptoProvider`** for verification — Workers lack Node `crypto`.
- **API v2026-04-22 (dahlia)** moved `Invoice.subscription` to `Invoice.parent.subscription_details.subscription`. Search for `.subscription` on Invoice-derived objects when bumping the SDK.
- **`PromotionCodeCreateParams` shape changed** in recent SDK versions — it's `{ promotion: { type: 'coupon', coupon: '...' } }` now, not `{ coupon: '...' }`. Centralise promo code creation so there's one place to fix.
- **`onSubscriptionCreated` is never called** if `onSubscriptionComplete` already ran — by the time `customer.subscription.created` arrives, the row exists and the plugin short-circuits. Use `onSubscriptionComplete` for first-checkout hooks.

---

## Files to copy from `snippets/`

- `snippets/server/utils/stripe.ts`
- `snippets/server/utils/requireActiveSubscription.ts`
- `snippets/server/utils/referrals.ts` (optional, only if you want the referral system)
- `snippets/server/api/billing/me.get.ts`
- `snippets/server/api/billing/portal.post.ts`
- `snippets/server/api/stripe/webhook.post.ts` (referral / post-payment side-effects)
- `snippets/server/routes/r/[code].get.ts` (optional, referral landing)
- `snippets/server/db/migrations/0003_stripe.sql`
- `snippets/server/db/migrations/0004_referrals.sql` (optional)
- `snippets/app/composables/useSubscription.ts`
- `snippets/app/middleware/subscription.ts`
- `snippets/shared/utils/constants.ts` (REFERRAL_COOKIE, REFERRAL_REWARD_CAP, PLAN_SLUG)
