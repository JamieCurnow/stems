/**
 * Cookie-backed consent choice (analytics + marketing).
 *
 * Stored in a first-party cookie (not localStorage) so SSR / edge code can
 * read it on the first request — the choice is honest on the very first
 * render.
 *
 * Categories map onto both providers we run:
 *   analytics → GA4 `analytics_storage` (Consent Mode v2) + PostHog capture
 *   marketing → GA4 `ad_storage` / `ad_user_data` / `ad_personalization`
 * `set()` writes the cookie and pushes the change straight to `gtag` and
 * PostHog, so a choice takes effect without a reload. The boot plugin
 * (`analytics.client.ts`) replays the stored choice for returning visitors.
 *
 * Bump CONSENT_VERSION when categories change — old cookies invalidate and
 * the banner re-shows.
 */
import { CONSENT_COOKIE } from '~~/shared/utils/constants'

const CONSENT_VERSION = 1
const SIX_MONTHS = 60 * 60 * 24 * 180

export interface ConsentChoice {
  analytics: boolean
  marketing: boolean
  version: number
  decidedAt: string
}

const DENIED_DEFAULT: ConsentChoice = {
  analytics: false,
  marketing: false,
  version: CONSENT_VERSION,
  decidedAt: ''
}

export function useConsent() {
  const cookie = useCookie<ConsentChoice | null>(CONSENT_COOKIE, {
    maxAge: SIX_MONTHS,
    sameSite: 'lax',
    secure: !import.meta.dev,
    default: () => null
  })

  const decided = computed(() => cookie.value != null && cookie.value.version === CONSENT_VERSION)

  const state = computed<ConsentChoice>(() =>
    decided.value ? (cookie.value as ConsentChoice) : DENIED_DEFAULT
  )

  function pushToGtag(next: ConsentChoice) {
    if (!import.meta.client) return
    // Access via window so this works even if the plugin hasn't booted yet —
    // calls before gtag.js loads are queued by the GTM stub.
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
    if (!gtag) return
    gtag('consent', 'update', {
      analytics_storage: next.analytics ? 'granted' : 'denied',
      ad_storage: next.marketing ? 'granted' : 'denied',
      ad_user_data: next.marketing ? 'granted' : 'denied',
      ad_personalization: next.marketing ? 'granted' : 'denied'
    })
  }

  function pushToPostHog(next: ConsentChoice) {
    if (!import.meta.client || import.meta.dev) return
    // PostHog boots opted-out with memory-only persistence (see nuxt.config
    // posthogConfig). Analytics consent maps onto its capturing + persistence:
    // opt in writes its cookie and starts capturing; opt out stops and drops
    // back to memory.
    const posthog = usePostHog()
    if (!posthog) return
    if (next.analytics) {
      posthog.opt_in_capturing()
      posthog.set_config({ persistence: 'localStorage+cookie' })
    } else {
      posthog.opt_out_capturing()
      posthog.set_config({ persistence: 'memory' })
    }
  }

  function set(input: { analytics: boolean; marketing: boolean }) {
    const choice: ConsentChoice = {
      analytics: input.analytics,
      marketing: input.marketing,
      version: CONSENT_VERSION,
      decidedAt: new Date().toISOString()
    }
    cookie.value = choice
    pushToGtag(choice)
    pushToPostHog(choice)
  }

  return {
    decided,
    state,
    set,
    acceptAll: () => set({ analytics: true, marketing: true }),
    rejectAll: () => set({ analytics: false, marketing: false }),
    reset: () => {
      cookie.value = null
    }
  }
}
