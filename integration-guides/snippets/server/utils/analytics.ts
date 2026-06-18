import type { H3Event } from 'h3'

/**
 * Server-side GA4 Measurement Protocol.
 *
 *   POST https://www.google-analytics.com/mp/collect
 *     ?measurement_id=…&api_secret=…
 *
 * Used from Stripe webhooks, referral redirects, and any other server
 * surface that should record a conversion immune to ad-blockers and
 * post-redirect drop-off.
 *
 *   await sendServerEvent(event, {
 *     name: 'purchase',
 *     userId: user.id,
 *     params: { value: 9.99, currency: 'gbp', transaction_id: invoice.id }
 *   })
 *
 * Soft-fails when the measurement id or api secret is missing — analytics
 * must never block billing or auth.
 */

export interface SendServerEventArgs {
  name: string
  userId?: string | null
  params?: Record<string, string | number | boolean | null | undefined>
  /** Backdate the event when replaying a webhook. Defaults to now. */
  timestampMicros?: number
  /** Hit /debug/mp/collect instead of /mp/collect when wiring up new events. */
  debug?: boolean
}

/**
 * Deterministic synthesised client_id from the user id. Webhooks have no
 * GA cookie, so we need a stable value. Same user → same client_id every
 * webhook. GA4 stitches the server events to browser events on user_id.
 */
function clientIdFromUser(userId: string): string {
  let hi = 0
  let lo = 0
  for (let i = 0; i < userId.length; i++) {
    const c = userId.charCodeAt(i)
    hi = ((hi << 5) - hi + c) | 0
    lo = ((lo << 7) - lo + c) | 0
  }
  return `${(hi >>> 0)}.${(lo >>> 0)}`
}

export async function sendServerEvent(event: H3Event, args: SendServerEventArgs): Promise<void> {
  const env = event.context.cloudflare?.env
  const measurementId = env?.NUXT_PUBLIC_GA4_MEASUREMENT_ID
  const apiSecret = env?.GA4_API_SECRET
  if (!measurementId || !apiSecret) {
    // Quiet no-op — analytics must never block the calling flow.
    return
  }

  const clientId = args.userId
    ? clientIdFromUser(args.userId)
    : `anon.${crypto.randomUUID()}`

  const cleanParams: Record<string, unknown> = {}
  if (args.params) {
    for (const [k, v] of Object.entries(args.params)) {
      if (v != null) cleanParams[k] = v
    }
  }
  // Server hits have no consent signal — flag them as non-personalised so
  // we never push them into Ads audiences.
  cleanParams.non_personalized_ads = true

  const body = {
    client_id: clientId,
    ...(args.userId ? { user_id: args.userId } : {}),
    ...(args.timestampMicros ? { timestamp_micros: args.timestampMicros } : {}),
    events: [{ name: args.name, params: cleanParams }]
  }

  const path = args.debug ? '/debug/mp/collect' : '/mp/collect'
  const url = `https://www.google-analytics.com${path}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (err) {
    console.warn('[analytics] Measurement Protocol POST failed:', err)
  }
}
