/**
 * Consent Mode v2 — cookie-backed user choice.
 *
 * Stored in a first-party cookie (not localStorage) so SSR / edge code can
 * read it on the first request and Consent Mode is honest on the very
 * first render. Every change re-pushes `gtag('consent', 'update', …)` so
 * tags react immediately.
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

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { gtag?: (...args: unknown[]) => void }
  // Calls before gtm.js boots are queued by the stub installed in
  // analytics.client.ts. Safe to call eagerly.
  w.gtag?.(...args)
}

function pushUpdate(choice: ConsentChoice) {
  gtag('consent', 'update', {
    analytics_storage: choice.analytics ? 'granted' : 'denied',
    ad_storage: choice.marketing ? 'granted' : 'denied',
    ad_user_data: choice.marketing ? 'granted' : 'denied',
    ad_personalization: choice.marketing ? 'granted' : 'denied'
  })
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

  function set(input: { analytics: boolean; marketing: boolean }) {
    const next: ConsentChoice = {
      analytics: input.analytics,
      marketing: input.marketing,
      version: CONSENT_VERSION,
      decidedAt: new Date().toISOString()
    }
    cookie.value = next
    pushUpdate(next)
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
