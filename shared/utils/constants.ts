/**
 * Cross-SSR-boundary constants. Anything imported by both client and server
 * code lives here.
 */

/** The single plan slug used inside Better Auth and across the app. */
export const PLAN_SLUG = '{{APP_SLUG}}'

/**
 * Name of the first-party Consent Mode v2 cookie. Read in two places — the
 * `useConsent` composable (read/write) and the `analytics.client.ts` boot
 * plugin (read on first paint) — so it lives here to stay in sync.
 */
export const CONSENT_COOKIE = '{{APP_SLUG}}_consent'

/* ---- Referral system (optional) ---- */

/**
 * Maximum number of free months a single referrer can earn over the
 * lifetime of their account. Once reached we still record redemptions
 * (referees still get their first month free) but stop crediting the
 * referrer's customer balance.
 */
export const REFERRAL_REWARD_CAP = 12

/**
 * Cookie name used to carry a referral code from the public /r/<code>
 * landing redirect through to the Checkout session creation.
 */
export const REFERRAL_COOKIE = '{{APP_REF_COOKIE}}'
