/**
 * Cookie-backed consent choice (analytics + marketing).
 *
 * Stored in a first-party cookie (not localStorage) so SSR / edge code can
 * read it on the first request — the choice is honest on the very first
 * render. Currently no analytics or marketing tags are wired up, so this is
 * dormant: it records the user's preference and nothing reads it yet.
 *
 * When an analytics provider is added (e.g. PostHog), have it consult
 * `state.value.analytics` on boot and react to `set()` — opt the SDK in/out
 * instead of the old Google Consent Mode `gtag('consent', …)` pushes that
 * used to live here.
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

  function set(input: { analytics: boolean; marketing: boolean }) {
    cookie.value = {
      analytics: input.analytics,
      marketing: input.marketing,
      version: CONSENT_VERSION,
      decidedAt: new Date().toISOString()
    }
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
