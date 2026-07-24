---
title: Analytics — GA4 + GTM + PostHog
description: Wire GA4 (via GTM) and PostHog into Stems, with Consent Mode v2, the existing cookie banner, user-id stitching, and a marketplace-shaped event taxonomy (contact-grower is the primary conversion).
priority: high
complexity: medium
status: done
timeEstimate: 4
---

# Analytics — GA4 + GTM + PostHog

## Goal

Measure the marketing funnel, buyer discovery, and grower activation across
Stems. Single source of truth for tags = Google Tag Manager, so we can add
Meta Pixel / LinkedIn Insight later without redeploying. PostHog runs alongside
for product analytics, funnels, and exception capture.

Stems is **free** (no subscription/revenue funnel), so the conversions are
marketplace-shaped: a buyer **contacting a grower**, and a grower **activating**
(onboarding + first listing).

## Decisions

| Decision | Chosen | Why |
|---|---|---|
| Tag manager | **GTM** (`GTM-K7VHMP47`) | One place for pixels + consent state. |
| GA4 property | `G-EBCF7SNNC5` | Single property (staging + prod both report to it). |
| Product analytics | **PostHog** (`phc_soAA…`, EU cloud) | Funnels, retention, autocapture, exceptions. |
| Consent | Google Consent Mode v2 + PostHog opt-out-by-default, default = denied | UK GDPR / PECR. |
| Env gating | Baked IDs + `import.meta.dev` guard | Analytics runs on every *deployed* build (staging + prod), silent in local dev. |
| Primary conversion | `contact_grower` | The marketplace's money action (WhatsApp / email / Instagram deep-link). |
| User ID | Better Auth user id | Sent as GA4 `user_id` + PostHog `identify`. |
| Referral codes in events | Hashed (SHA-256, first 12 hex) | Avoids PII-adjacent identifiers. |
| Search terms | **length only**, never the query text | Privacy-friendly. |

## Environment / config

Public IDs are non-secret, so they're **baked as defaults** in
`nuxt.config.ts` (`runtimeConfig.public` + `posthogConfig`). They can be
overridden per-env via `NUXT_PUBLIC_*` (see `.env.example`) but nothing is
required for analytics to work on a deployed build.

- `NUXT_PUBLIC_GTM_ID` → `runtimeConfig.public.gtmId` (default `GTM-K7VHMP47`)
- `NUXT_PUBLIC_GA4_MEASUREMENT_ID` → `runtimeConfig.public.ga4MeasurementId` (default `G-EBCF7SNNC5`)
- `NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN` / `NUXT_PUBLIC_POSTHOG_HOST` → PostHog

Secret (wrangler secret, never committed) — only needed for server-side GA4:

- `GA4_API_SECRET` — used by `server/utils/analytics.ts` (Measurement Protocol).
  Optional; the sender soft-fails without it.
  `wrangler secret put GA4_API_SECRET --env staging` (and `--env production`).

## Architecture

```
┌────────────────┐  dataLayer.push  ┌───────────┐  →  GA4 (G-EBCF7SNNC5)
│ analytics      │ ───────────────► │   GTM     │  →  future pixels…
│ .client plugin │                  │ container │
└──────┬─────────┘                  └───────────┘
       │ useAnalytics().track()
       ▼
   <script setup> files (CTAs, contact, share, forms…)

@posthog/nuxt module ──► PostHog (opt-out until consent)
server/utils/posthog.ts ──► PostHog (server, e.g. referral_landed)
server/utils/analytics.ts ──► GA4 Measurement Protocol (server, needs secret)
```

## Files

### New
- `app/plugins/analytics.client.ts` — GTM boot + Consent Mode v2 defaults; skips local dev.
- `app/composables/useAnalytics.ts` — typed `track()/setUserId()/setUserProperties()`.
- `app/composables/useAnalyticsIdentity.ts` — syncs `user_id` + `is_grower` and PostHog identity.
- `server/utils/analytics.ts` — GA4 Measurement Protocol (`sendServerEvent`) + `hashCode`.
- `server/utils/posthog.ts` — server PostHog client (`useServerPostHog` / `flushServerPostHog`).
- `roadmap/analytics/index.md` + `roadmap/analytics/gtm-container.json`.

### Modified
- `nuxt.config.ts` — `@posthog/nuxt` module, `runtimeConfig.public`, `posthogConfig`.
- `app/composables/useConsent.ts` — now drives `gtag('consent', …)` + PostHog opt-in/out.
- `app/app.vue` — calls `useAnalyticsIdentity()` (client only).
- `server/types/cloudflare.d.ts` — analytics binding types.
- `.env.example`, `wrangler.jsonc` — analytics vars/secret notes.
- Call-sites (see below).

## Events

| Group | Event | Params |
|---|---|---|
| **Acquisition** | `cta_click` | `cta_location`, `cta_label`, `destination` |
| | `faq_open` * | `question_label` |
| | `scroll_section_view` * | `section_id` |
| **Buyer funnel** | `discover_search` | `query_length`, `result_count` |
| | `grower_view` | `grower_handle` |
| | `flower_view` | `flower_id`, `grower_handle` |
| | **`contact_grower`** | `method`, `grower_handle`, `source` |
| | `share` | `content_type`, `method` |
| **Auth** | `sign_in_code_requested` | `has_referral` |
| | `login` | `method` |
| | `sign_up` | `method` |
| **Grower activation** | `onboarding_complete` | `is_grower` |
| | `flower_create` | `has_photo` |
| | `invoice_create` | — |
| | `profile_update` | — |
| **Server-side** | `referral_landed` | `code_hash` (via PostHog, from `/r/[code]`) |

`*` = defined in the container but not yet wired (no FAQ accordion / section
observer on the current landing page). Add later without a container reimport.

### User properties
- `is_grower` — seller vs buyer (Stems' core segmentation).
- `signup_month` — `YYYY-MM`, from the profile's `createdAt`.

### Conversions to mark as Key Events in GA4
`contact_grower`, `sign_up`, `onboarding_complete`, `flower_create`.

## GTM setup (one-time)

1. GTM → Admin → **Import Container** → `roadmap/analytics/gtm-container.json`.
2. Workspace = current; Import option = **Merge**.
3. Review: adds 4 tags, 3 triggers, 22 variables. **Confirm**, then **Publish**.

The container ships:
- **GA4 — Configuration** (`G-EBCF7SNNC5`), All Pages.
- **GA4 — Event (catch-all)** re-emitting our custom events with params intact.
- **GA4 — Set user_id** / **Set user properties** (Custom HTML) off the
  `set_user_id` / `set_user_properties` dataLayer pushes.
- Custom-event triggers + 22 Data Layer Variables.

Then in GA4 mark the four conversions above as Key Events.

## QA

1. Deploy (staging). Open in a private window → cookie banner shows.
2. Reject → no GA/PostHog cookies, only cookieless pings. Accept → full payloads.
3. Use GA4 DebugView + PostHog live events to confirm `contact_grower`,
   `grower_view`, `share`, `sign_up` fire with expected params.
4. `nuxt dev` → confirm **no** GTM/PostHog network calls (dev is skipped).

## Deferred / out of scope
- `faq_open`, `scroll_section_view` — no FAQ/section-observer on the landing yet.
- `flower_status_change` — noisy; revisit if sell-through data is needed.
- Server-side GA4 conversions — none required while the app is free (no Stripe revenue).
- Search Console verification — separate task (meta tag in `app.vue` or DNS).
- Server-side GTM container — overkill for current volume.
