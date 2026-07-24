/**
 * Client-only analytics bootstrap.
 *
 *   1. Initialise dataLayer + a default Consent Mode v2 state (everything
 *      denied until the user opts in via the banner).
 *   2. Apply whatever choice is already stored in the consent cookie.
 *   3. Load the GTM script.
 *
 * Identity sync (user_id + user_properties from auth/profile) is driven from
 * `app.vue` via `useAnalyticsIdentity()` — Vue reactivity is cleaner there
 * than in a boot-time plugin.
 *
 * GTM is the single tag manager — GA4 and any future pixels are configured
 * inside the GTM container. PostHog is initialised separately by the
 * `@posthog/nuxt` module (booted opt-out; `useConsent()` opts it in on
 * consent). See roadmap/analytics/.
 *
 * Skipped entirely in local dev so `nuxt dev` traffic never reaches the
 * shared GA4 property / PostHog project. Deployed builds (staging + prod)
 * run it; the cookie banner + Consent Mode keep it GDPR-honest there.
 */
export default defineNuxtPlugin(() => {
  if (import.meta.dev) return

  const { gtmId } = useRuntimeConfig().public
  if (!gtmId) return

  const w = window as unknown as {
    dataLayer?: Array<Record<string, unknown> | IArguments>
    gtag?: (...args: unknown[]) => void
  }
  w.dataLayer = w.dataLayer ?? []
  // Classic gtag stub — same shape Google ships in their snippet.
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments)
  }

  // Consent Mode v2 — default everything to denied. Must land on the
  // dataLayer BEFORE GTM loads so the first tags that fire pick it up.
  w.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  })

  // Apply any previously stored choice immediately so returning visitors
  // don't lose a tick of analytics waiting for the banner code to mount.
  const consent = useConsent()
  if (consent.decided.value) {
    const s = consent.state.value
    w.gtag('consent', 'update', {
      analytics_storage: s.analytics ? 'granted' : 'denied',
      ad_storage: s.marketing ? 'granted' : 'denied',
      ad_user_data: s.marketing ? 'granted' : 'denied',
      ad_personalization: s.marketing ? 'granted' : 'denied'
    })
    // PostHog boots opted-out (nuxt.config posthogConfig). A returning
    // visitor who already granted analytics consent must be opted back in
    // here, otherwise nothing is captured until they revisit the banner.
    if (s.analytics) {
      const posthog = usePostHog()
      posthog?.opt_in_capturing()
      posthog?.set_config({ persistence: 'localStorage+cookie' })
    }
  }

  w.gtag('js', new Date())

  // Standard GTM loader.
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`
  document.head.appendChild(script)

  w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
})
