# Analytics — GTM + GA4 + Consent Mode v2

A single GTM container drives all client-side analytics. GA4 is configured inside GTM (not loaded directly), so you can layer pixels later without changing the app. Server-side conversions (Stripe webhooks, referral landings) fire via the GA4 Measurement Protocol so they survive ad-blockers and post-redirect drop-off.

Three moving parts:

1. **Client bootstrap** — a `*.client.ts` plugin that installs the `dataLayer` + Consent Mode v2 defaults, then injects `gtm.js`.
2. **Typed `useAnalytics()` composable** — one choke-point for `track()` / `setUserId()` / `setUserProperties()` so call sites stay tidy and provider swaps are mechanical.
3. **Server `sendServerEvent()` helper** — GA4 Measurement Protocol POSTs from Nitro routes / webhooks, with deterministic synthetic `client_id` derived from the user id so server-sent events stitch into the right user.

Plus: a cookie-backed `useConsent()` composable and a minimal banner/manage dialog so Consent Mode v2 has something to listen to.

---

## Environment variables

Three IDs. Two public, one secret.

```jsonc
// wrangler.jsonc — under env.<env>.vars
"NUXT_PUBLIC_GTM_ID": "GTM-XXXXXXX",
"NUXT_PUBLIC_GA4_MEASUREMENT_ID": "G-XXXXXXXXXX"
```

```bash
# Production secret (server-side Measurement Protocol)
wrangler secret put GA4_API_SECRET --env production
```

```bash
# .env.example
NUXT_PUBLIC_GTM_ID=
NUXT_PUBLIC_GA4_MEASUREMENT_ID=
GA4_API_SECRET=
```

Mirror the two public vars in `nuxt.config.ts`:

```ts
runtimeConfig: {
  public: {
    gtmId: '',            // ← NUXT_PUBLIC_GTM_ID
    ga4MeasurementId: ''  // ← NUXT_PUBLIC_GA4_MEASUREMENT_ID
  }
}
```

And add them to your Cloudflare env typing so the server-side helper can read them off `event.context.cloudflare.env`:

```ts
// server/types/cloudflare.d.ts
NUXT_PUBLIC_GTM_ID: string
NUXT_PUBLIC_GA4_MEASUREMENT_ID: string
GA4_API_SECRET: string
```

The `GA4_API_SECRET` is created in GA4 Admin → Data Streams → your stream → Measurement Protocol API secrets.

---

## 1. Client plugin — `app/plugins/analytics.client.ts`

Runs once on the client, in this exact order so the first GTM tag fires already see the consent state:

1. Seed `window.dataLayer` and a `gtag` stub (same shape Google ships).
2. Push **Consent Mode v2 defaults — everything denied** (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`). `functionality_storage` and `security_storage` are granted (always-on essentials). `wait_for_update: 500` keeps tags paused for up to 500ms so a returning user's consent cookie can land first.
3. If the user has a stored choice, immediately push `consent: 'update'` with it.
4. Push `gtag('js', new Date())`.
5. Append the `https://www.googletagmanager.com/gtm.js?id=<gtmId>` script.
6. Push `{ 'gtm.start': Date.now(), event: 'gtm.js' }`.

Skipped entirely when `gtmId` is empty — keeps preview / dev environments quiet without code changes.

GA4 is **not** loaded by this plugin. It's a GA4 tag configured inside the GTM container, firing on `All Pages` (or a custom trigger). That way you can later add Meta, LinkedIn, Reddit pixels etc. via GTM without touching the app.

---

## 2. `useAnalytics()` composable — `app/composables/useAnalytics.ts`

Thin, typed wrapper around `dataLayer.push`:

```ts
const { track, setUserId, setUserProperties } = useAnalytics()

track('cta_click', { cta_location: 'hero', cta_label: 'Start trial' })
setUserId('user_123')
setUserProperties({ subscription_status: 'trialing' })
```

- `track(name, params)` → `dataLayer.push({ event: name, ...params })`
- `setUserId(id | null)` → pushes `{ event: 'set_user_id', user_id: id }`
- `setUserProperties(props)` → pushes `{ event: 'set_user_properties', user_properties: props }`

Server-side and pre-GTM calls are no-ops at the call-site level; once GTM boots, its stub flushes anything that was queued on `dataLayer` before the script arrived, so there's no race to manage.

The matching GTM container is shipped as an importable JSON — see [§ GTM container import](#-gtm-container-import) below. The shape it expects from the dataLayer is:

- `user_id` and `user_properties` events for identity sync.
- All other events follow `{ event: '<snake_case_name>', ...params }` — the container's catch-all GA4 tag forwards them to GA4 with every registered param.

---

## 3. Identity sync — `app/composables/useAnalyticsIdentity.ts`

Called once from `app.vue` (client-only):

```vue
<script setup lang="ts">
if (import.meta.client) await useAnalyticsIdentity()
</script>
```

It watches:

- the Better Auth session → pushes `setUserId(session.user.id ?? null)`
- the shared `billing-status` `useState` populated by `useSubscription()` → pushes `setUserProperties({ subscription_status })`

Kept in `app.vue` (not the plugin) so Vue reactivity does the work — easier than re-wiring watchers from a boot-time plugin.

---

## 4. Consent Mode v2 — `app/composables/useConsent.ts`

Persists user choice in a first-party cookie (not localStorage) so SSR / edge can read it on the first request and Consent Mode is honest on the very first render.

```ts
const CONSENT_COOKIE = '{{APP_SLUG}}_consent'
const CONSENT_VERSION = 1
const SIX_MONTHS = 60 * 60 * 24 * 180
```

Stored shape:

```ts
type ConsentChoice = {
  analytics: boolean   // → analytics_storage
  marketing: boolean   // → ad_storage, ad_user_data, ad_personalization
  version: number
  decidedAt: string
}
```

Bump `CONSENT_VERSION` whenever the categories change — that invalidates old cookies and re-shows the banner. The composable exposes:

- `decided` (computed) — true when a valid, current-version cookie exists
- `state` (computed) — the choice (or a denied-default object)
- `set({ analytics, marketing })`, `acceptAll()`, `rejectAll()`, `reset()`

Every change re-pushes `gtag('consent', 'update', …)`. Accessed via `window.gtag` so it works whether the plugin has booted yet or not — calls before `gtm.js` loads get queued by the stub.

---

## 5. Banner + manage dialog

Two components in `app/components/Layout/`:

- **`CookieConsent.vue`** — bottom-sheet banner with Accept / Reject / Manage. Visible when `!consent.decided`. Mounted permanently in `app.vue` inside `<UApp>`.
- **`ConsentManageDialog.vue`** — modal with three switches: "Strictly functional" (locked on), "Analytics", "Marketing". Seeds toggles from the cookie each time it opens so users can revisit their choice from a `/cookies` page link.

Keep the analytics + marketing categories aligned with Consent Mode v2 signals. If you add new pixels (e.g. Microsoft Ads, TikTok), they all live under the same two umbrellas — no schema changes.

---

## 6. Server-side Measurement Protocol — `server/utils/analytics.ts`

`sendServerEvent(event, { name, params, userId })` POSTs to:

```
https://www.google-analytics.com/mp/collect?measurement_id=…&api_secret=…
```

Key details:

- **`client_id` is required**. Webhooks don't have the browser's GA cookie, so we synthesise a stable one from the `userId` via a deterministic char-code hash → `${hi}.${lo}`. Same user → same client_id every webhook. GA4 treats these as a separate "server" stream but `user_id` stitching joins them to the browser user in reports.
- **Soft-fail**. If the measurement id or api secret is missing, log a warning and return — analytics must never block billing.
- **`non_personalized_ads: true`** — server events have no consent signal.
- **`timestamp_micros`** lets you back-date the event if the webhook is replayed.
- **Debug mode** swaps the endpoint to `/debug/mp/collect` and returns validation details — handy when wiring up a new event in staging.

The helper is called from:

- `server/api/stripe/webhook.post.ts` — `trial_start`, `purchase`, `subscription_cancelled`, `subscription_reactivated`. Always passes `userId` so the events stitch. A referral-credited purchase carries a `referral_redeemed: true` param on the `purchase` event rather than firing a separate event. (Renewals aren't split out by default — see the `subscription_renewed` comment in the webhook for how to add it once you track `firstPaidInvoiceAt`.)
- `server/routes/r/[code].get.ts` — `referral_landed`, fired with a SHA-256 hashed `code_hash` param (12 hex chars) so we never leak the raw referral code into a third-party tool. Uses `event.context.waitUntil(...)` so the GA POST runs after the redirect returns to the user.

GA4 conversions worth marking as "Key events" inside GA4 Admin: `purchase`, `trial_start`. The rest are useful funnel events but not conversions.

---

## Event taxonomy

Names follow GA4's recommended-event vocabulary where they exist (`purchase`, `begin_checkout`); custom ones are snake_case verbs.

**Client** — the `useAnalytics().track(...)` helper ships, but the template doesn't pre-wire any specific client events (it has no landing page or waitlist). The table below is a **suggested taxonomy** to wire as you build those surfaces — the file column shows where each would naturally live:

| Event                          | Suggested source                    |
| ------------------------------ | ----------------------------------- |
| `app_open`                     | app layout (with `is_first_session`) |
| `cta_click`                    | landing page CTAs (`cta_location`, `cta_label`, `destination`) |
| `faq_open`                     | landing page FAQ accordions         |
| `demo_video_play`              | landing page                        |
| `scroll_section_view`          | landing page IntersectionObserver   |
| `magic_link_requested`         | `pages/login.vue`                   |
| `magic_link_request_failed`    | `pages/login.vue`                   |
| `begin_checkout`               | `useSubscription().startCheckout()` |
| `checkout_redirect`            | `useSubscription().startCheckout()` |
| `manage_subscription_clicked`  | `useSubscription()`                 |
| `waitlist_join`, etc.          | a waitlist form component           |

**Server** (via `sendServerEvent`) — these are actually wired in the template:

| Event                       | Source                              |
| --------------------------- | ----------------------------------- |
| `trial_start`               | `customer.subscription.created` w/ trialing |
| `purchase`                  | first paid invoice (carries `referral_redeemed: true` when a referral was credited) |
| `subscription_cancelled`    | cancel_at_period_end / deleted      |
| `subscription_reactivated`  | reactivation update                 |
| `referral_landed`           | `/r/[code]` redirect                |

Use the client list as a starting set — the shape (snake_case names, small typed params, server for revenue) matters more than the exact list.

---

## GTM container import

`snippets/gtm-container-template.json` is a complete, importable container that wires up everything described above. Drop it into a fresh GTM container instead of clicking the UI together by hand.

### What it contains

**4 tags:**

- `GA4 — Configuration` — the GA4 base config tag, fires on `Initialization - All Pages`.
- `GA4 — Event (catch-all)` — single GA4 event tag, event-name `{{Event}}` (the dataLayer event name), forwards every registered DLV param. Fires on the App-events trigger.
- `GA4 — Set user_id` — Custom HTML, calls `gtag('config', '<GA4_ID>', { user_id })` on the `set_user_id` dataLayer push.
- `GA4 — Set user properties` — Custom HTML, calls `gtag('set', 'user_properties', …)` on the `set_user_properties` dataLayer push.

**3 triggers:**

- `Custom Event — set_user_id` (exact match)
- `Custom Event — set_user_properties` (exact match)
- `Custom Event — App events` (regex match — see below)

**23 DLVs:** `user_id`, `user_properties`, `cta_location`, `cta_label`, `destination`, `section_id`, `question_label`, `method`, `has_referral_code`, `has_referral`, `error_message`, `currency`, `value`, `provider`, `code_hash`, `channel`, `is_first_session`, `source`, `from`, `to`, `mode`, `transaction_id`, `items`.

**5 built-in variables enabled:** Page URL, Page Hostname, Page Path, Referrer, Event.

### Placeholders to replace before importing

Two find/replace passes:

| Placeholder              | Replace with                                 |
| ------------------------ | -------------------------------------------- |
| `{{GA4_MEASUREMENT_ID}}` | Your GA4 measurement ID (e.g. `G-XXXXXXXXXX`) — appears 3× |
| `{{CONTAINER_NAME}}`     | The GTM container's display name (e.g. your apex domain) |

The placeholder `{{DLV - …}}` strings inside the catch-all tag are **not** placeholders — they're GTM's literal variable-reference syntax and must stay as-is.

The exported `GTM-XXXXXXX` `publicId` is overwritten by GTM on import (it uses the destination container's real ID), so it doesn't need editing.

### Import steps

1. Create a new container in [tagmanager.google.com](https://tagmanager.google.com) (type: Web).
2. Replace the two placeholders in a copy of the JSON.
3. **Admin → Import Container → Choose file** → pick the edited JSON.
4. Workspace: **New** (named e.g. "Initial setup"). Import option: **Merge → Overwrite** is fine on a fresh container.
5. Review the diff GTM shows you (4 tags, 3 triggers, 23 variables added), then **Confirm**.
6. **Submit → Publish** to push v1 live.
7. Copy the container's `GTM-XXXXXXX` ID into `NUXT_PUBLIC_GTM_ID` in your `wrangler.jsonc` / `.env`.

### Extending the event regex

The App-events trigger uses this regex to decide which dataLayer events get forwarded to GA4:

```
^(cta_click|faq_open|scroll_section_view|sign_up_started|sign_up|login|sign_up_failed|magic_link_requested|magic_link_request_failed|begin_checkout|checkout_redirect|manage_subscription_clicked|referral_link_copy|referral_link_share|app_open)$
```

The allow-list pattern is deliberate — anything firing on the dataLayer that isn't in this regex is ignored, which prevents accidental third-party scripts (or future framework changes that push noisy events) from polluting your GA4 stream.

To add app-specific events (this repo, for example, also tracks `map_basemap_change`, `map_layer_toggle`, `parcel_click`, `site_create`, etc.):

1. After import, open **Triggers → Custom Event — App events** in the GTM UI.
2. Add the new event names to the regex (pipe-separated, no spaces).
3. If the new events introduce new params, also: **Variables → User-Defined → New → Data Layer Variable**, name it `DLV - <param>` with Data Layer Variable Name = `<param>`, then add a row to the catch-all tag's Event Parameters table mapping `<param> → {{DLV - <param>}}`.
4. Submit + publish.

Server-sent events (via Measurement Protocol) **don't go through GTM** — they hit GA4 directly — so adding `purchase`, `trial_start` etc. requires no GTM changes.

---

## Porting checklist

1. Add `gtmId` + `ga4MeasurementId` to `nuxt.config.ts → runtimeConfig.public`.
2. Add the three env vars to `wrangler.jsonc` (`vars` for the two `NUXT_PUBLIC_*`, secret for `GA4_API_SECRET`) and `.env.example`.
3. Extend `server/types/cloudflare.d.ts` with all three.
4. Copy `app/plugins/analytics.client.ts`.
5. Copy `app/composables/useAnalytics.ts`, `useAnalyticsIdentity.ts`, `useConsent.ts`.
6. Copy `app/components/Layout/CookieConsent.vue` + `ConsentManageDialog.vue`, mount the banner inside `<UApp>` in `app.vue`. Rename the cookie (`{{APP_SLUG}}_consent`).
7. Copy `server/utils/analytics.ts`. Wire `sendServerEvent` calls into your Stripe webhook + any other server-side conversion points.
8. Call `await useAnalyticsIdentity()` inside `app.vue` under `if (import.meta.client)`.
9. Create a new GTM container and import `snippets/gtm-container-template.json` (after replacing `{{GA4_MEASUREMENT_ID}}` and `{{CONTAINER_NAME}}`). Publish v1. Paste the new `GTM-XXXXXXX` into `NUXT_PUBLIC_GTM_ID`.
10. In GA4: enable Google signals only if you really need demographics, set data retention, mark `purchase` / `trial_start` / `referral_redeemed` as Key events.

That's the entire integration — about 250 lines of app code, all of which is generic.
