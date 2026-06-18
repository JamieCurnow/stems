import Stripe from 'stripe'
import type { H3Event } from 'h3'

/**
 * Build a Stripe SDK client wired for the Cloudflare Workers runtime.
 *
 * Workers don't have Node's `crypto` or `http` polyfill. Two adapters fix it:
 *   - `Stripe.createFetchHttpClient()`        — swaps Node http for fetch
 *   - `Stripe.createSubtleCryptoProvider()`   — swaps crypto for SubtleCrypto
 *                                              (used for webhook signature
 *                                              verification; pair with
 *                                              constructEventAsync, never
 *                                              constructEvent)
 *
 * Request-scoped because secrets live on event.context.cloudflare.env.
 */
export function useStripe(event: H3Event): Stripe {
  const env = event.context.cloudflare?.env
  if (!env?.STRIPE_SECRET_KEY) {
    throw createError({
      statusCode: 500,
      statusMessage: 'STRIPE_SECRET_KEY not set on event.context.cloudflare.env'
    })
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
    typescript: true
  })
}

export const stripeCryptoProvider = Stripe.createSubtleCryptoProvider()
