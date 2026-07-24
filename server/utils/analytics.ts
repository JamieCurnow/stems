import type { H3Event } from 'h3'

/**
 * GA4 Measurement Protocol — server-side event sender.
 *
 * Used for conversions that must arrive even when the user has left the site
 * or is blocking client-side analytics (e.g. `referral_landed` from the
 * public /r/<code> redirect).
 *
 * Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 *
 * Config: the (public) measurement id comes from runtimeConfig (baked default
 * in nuxt.config.ts); the api secret is a server-only wrangler secret. Never
 * throws — analytics must never break a request.
 *
 * Note on client_id: Measurement Protocol requires it. When firing from a
 * server route we don't have the browser's GA cookie, so we synthesise a
 * stable one from the user id (or a random one for anonymous events). GA
 * stitches by user_id where available.
 */

type Primitive = string | number | boolean | null | undefined
type EventParam = Primitive | Primitive[] | Record<string, Primitive> | Array<Record<string, Primitive>>
type EventParams = Record<string, EventParam>

interface SendOpts {
  name: string
  params?: EventParams
  userId?: string | null
  clientId?: string
  /** Set true to land events in GA4 DebugView instead of production reports. */
  debug?: boolean
}

function getConfig(event: H3Event) {
  const measurementId = useRuntimeConfig(event).public.ga4MeasurementId
  const apiSecret = event.context.cloudflare?.env?.GA4_API_SECRET
  if (!measurementId) return { error: 'ga4MeasurementId missing from runtimeConfig' as const }
  if (!apiSecret)
    return {
      error: 'GA4_API_SECRET secret not set (wrangler secret put GA4_API_SECRET --env <env>)' as const
    }
  return { measurementId, apiSecret }
}

function clientIdFor(userId: string | null | undefined) {
  // GA4 expects a `client_id` of the form `1234567890.1234567890`.
  // Hash the user id deterministically so the same user produces the same
  // synthetic id across events.
  if (!userId) {
    const random = Math.floor(Math.random() * 1e10)
    return `${random}.${Math.floor(Date.now() / 1000)}`
  }
  let hi = 0
  let lo = 0
  for (let i = 0; i < userId.length; i++) {
    const c = userId.charCodeAt(i)
    hi = (hi * 31 + c) % 1_000_000_000
    lo = (lo * 37 + c) % 1_000_000_000
  }
  return `${hi}.${lo}`
}

export async function sendServerEvent(event: H3Event, opts: SendOpts) {
  const cfg = getConfig(event)
  if ('error' in cfg) {
    // Soft fail — analytics must never block the request. Logged so config
    // drift shows up in Workers Logs.
    console.warn(`[analytics] skipping ${opts.name}: ${cfg.error}`)
    return
  }

  const body = {
    client_id: opts.clientId ?? clientIdFor(opts.userId),
    user_id: opts.userId ?? undefined,
    timestamp_micros: Date.now() * 1000,
    non_personalized_ads: true,
    events: [
      {
        name: opts.name,
        params: opts.params ?? {}
      }
    ]
  }

  const url = new URL(
    opts.debug
      ? 'https://www.google-analytics.com/debug/mp/collect'
      : 'https://www.google-analytics.com/mp/collect'
  )
  url.searchParams.set('measurement_id', cfg.measurementId)
  url.searchParams.set('api_secret', cfg.apiSecret)

  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      console.warn('[analytics] GA4 returned non-2xx', res.status, await res.text())
    }
  } catch (err) {
    console.warn('[analytics] GA4 send failed', (err as Error).message)
  }
}

/**
 * Hash a referral code so we can include it in analytics events without
 * leaking the raw, user-shareable identifier into a third-party tool.
 * 12 hex chars of SHA-256 is enough to disambiguate every code that will
 * ever exist, and not reversible.
 */
export async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code)
  const buf = await crypto.subtle.digest('SHA-256', data)
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return hex.slice(0, 12)
}
