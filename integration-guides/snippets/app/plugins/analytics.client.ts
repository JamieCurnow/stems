/**
 * Client-only analytics bootstrap.
 *
 * Order matters: dataLayer + gtag stub must exist BEFORE we push Consent
 * Mode v2 defaults, which must in turn run BEFORE gtm.js is injected — so
 * the first tags GTM evaluates already see the consent state.
 *
 * 1. Seed window.dataLayer + a gtag stub (same shape Google ships).
 * 2. Push Consent Mode v2 defaults — everything denied except functional /
 *    security storage. `wait_for_update: 500` pauses tags for up to 500ms
 *    so the user's stored choice (read by useConsent) can land first.
 * 3. If a stored choice already exists, push consent: 'update' immediately.
 * 4. Push `gtag('js', new Date())`.
 * 5. Inject gtm.js. Push gtm.start.
 *
 * Skipped entirely when NUXT_PUBLIC_GTM_ID is empty — keeps dev / preview
 * quiet without code changes.
 *
 * GA4 is NOT loaded here. It runs as a GA4 tag inside the GTM container so
 * you can add Meta / LinkedIn / Reddit pixels later without touching code.
 */
import { CONSENT_COOKIE } from '~~/shared/utils/constants'

type ConsentChoice = {
  analytics: boolean
  marketing: boolean
  version: number
  decidedAt: string
}

function readConsentCookie(): ConsentChoice | null {
  const match = document.cookie
    .split('; ')
    .find(c => c.startsWith(`${CONSENT_COOKIE}=`))
  if (!match) return null
  try {
    return JSON.parse(decodeURIComponent(match.split('=')[1] ?? '')) as ConsentChoice
  } catch {
    return null
  }
}

export default defineNuxtPlugin(() => {
  const { gtmId } = useRuntimeConfig().public
  if (!gtmId) return

  const w = window as unknown as {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }

  // 1. dataLayer + gtag stub
  w.dataLayer = w.dataLayer || []
  w.gtag = w.gtag || function (...args: unknown[]) {
    ;(w.dataLayer as unknown[]).push(args)
  }

  // 2. Consent Mode v2 defaults — denied
  w.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  })

  // 3. Restore stored choice if present (cookie name shared with useConsent).
  const stored = readConsentCookie()
  if (stored) {
    w.gtag('consent', 'update', {
      analytics_storage: stored.analytics ? 'granted' : 'denied',
      ad_storage: stored.marketing ? 'granted' : 'denied',
      ad_user_data: stored.marketing ? 'granted' : 'denied',
      ad_personalization: stored.marketing ? 'granted' : 'denied'
    })
  }

  // 4. gtag('js', new Date())
  w.gtag('js', new Date())

  // 5. Inject gtm.js + bootstrap event
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(String(gtmId))}`
  document.head.appendChild(script)
  ;(w.dataLayer as unknown[]).push({ 'gtm.start': Date.now(), event: 'gtm.js' })
})
