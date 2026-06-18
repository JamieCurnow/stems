import { betterAuth, type BetterAuthOptions, type BetterAuthPlugin } from 'better-auth'
import { magicLink } from 'better-auth/plugins'
import { stripe as stripePlugin } from '@better-auth/stripe'
import Stripe from 'stripe'
import type { H3Event } from 'h3'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../db/schema'
import { ensureUserHasReferralCode, recordReferralRedemption } from './referrals'
import { sendEmail } from './email'

/**
 * Build a Better Auth instance from the request-scoped D1 binding.
 *
 * Cloudflare bindings are request-scoped — you can't import them at module
 * load time (there's no global `env`). So we build a fresh Better Auth
 * instance per request, reading `env.DB` from the H3 context.
 *
 * Drop the Stripe plugin entirely if you don't need billing — the magicLink
 * + database options stand alone.
 */
export function serverAuth(event: H3Event) {
  const env = event.context.cloudflare?.env
  if (!env?.DB) {
    throw new Error(
      `D1 binding DB not found on event.context.cloudflare.env.
      Check wrangler.jsonc and nuxt.config.ts cloudflare bindings.`
    )
  }

  const db = drizzle(env.DB, { schema })

  // Stripe billing is opt-in: the plugin only loads when STRIPE_SECRET_KEY is
  // set, so magic-link auth keeps working in dev before Stripe is configured —
  // and the Stripe client is never constructed (it throws on an undefined key)
  // when billing isn't in use. Drop this whole block, plus the `Stripe` and
  // `@better-auth/stripe` imports, to remove billing entirely.
  const stripePlugins: BetterAuthPlugin[] = []
  if (env.STRIPE_SECRET_KEY) {
    const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      httpClient: Stripe.createFetchHttpClient(),
      typescript: true
    })
    stripePlugins.push(
      stripePlugin({
        stripeClient,
        stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
        createCustomerOnSignUp: true,
        subscription: {
          enabled: true,
          plans: [
            {
              name: '{{APP_SLUG}}',
              priceId: env.STRIPE_PRICE_ID,
              freeTrial: { days: 7 }                  // optional
            }
          ],
          getCheckoutSessionParams: async (_data, req) => {
            const cookieHeader = req?.headers.get('cookie') ?? ''
            const refMatch = cookieHeader.match(/(?:^|;\s*){{APP_REF_COOKIE}}=([^;]+)/)
            const refCode = refMatch?.[1] ? decodeURIComponent(refMatch[1]) : null

            const baseParams: Stripe.Checkout.SessionCreateParams = {
              payment_method_collection: 'always',
              automatic_tax: { enabled: true },
              billing_address_collection: 'auto',
              customer_update: { address: 'auto', name: 'auto' },
              tax_id_collection: { enabled: false },
              subscription_data: {
                trial_period_days: 7,
                metadata: refCode ? { referral_code: refCode } : {}
              }
            }

            if (refCode && env.STRIPE_REFERRAL_COUPON_ID) {
              try {
                const promo = await stripeClient.promotionCodes.list({
                  code: refCode,
                  active: true,
                  limit: 1
                })
                if (promo.data[0]) {
                  return {
                    params: {
                      ...baseParams,
                      discounts: [{ promotion_code: promo.data[0].id }]
                    }
                  }
                }
              } catch {
                // fall through — user can still type a code on the hosted page
              }
            }

            return {
              params: { ...baseParams, allow_promotion_codes: true }
            }
          },
          onSubscriptionComplete: async ({ subscription, stripeSubscription }) => {
            // Issue a referral code for the new subscriber (idempotent) so
            // they can refer others.
            if (env.STRIPE_REFERRAL_COUPON_ID) {
              await ensureUserHasReferralCode({
                userId: subscription.referenceId,
                db,
                stripe: stripeClient,
                couponId: env.STRIPE_REFERRAL_COUPON_ID
              })
            }
            // Record the redemption here, not in `onSubscriptionCreated`.
            // The plugin processes checkout.session.completed first (which
            // fires this hook), then customer.subscription.created arrives
            // and the plugin short-circuits — never calling
            // onSubscriptionCreated. See
            // `@better-auth/stripe/dist/index.mjs:254-257`.
            const refCode = stripeSubscription.metadata?.referral_code
            if (refCode) {
              await recordReferralRedemption({
                refereeUserId: subscription.referenceId,
                referralCode: refCode,
                refereeStripeSubscriptionId: stripeSubscription.id,
                db
              })
            }
            // Wire up your trial onboarding sequence here if relevant.
            // E.g. if (subscription.status === 'trialing') await onTrialStart(event, subscription.referenceId)
          }
        }
      })
    )
  }

  // Cloudflare bindings (DB) and secrets (BETTER_AUTH_*, STRIPE_*) both live
  // on event.context.cloudflare.env in dev (via Miniflare reading .env) and
  // in prod (via wrangler secret put). Don't reach for process.env — it's
  // empty in the Workers runtime.
  const options: BetterAuthOptions = {
    database: env.DB,
    emailAndPassword: { enabled: false },           // Magic Link only
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,

    // Capture the referral cookie at signup, persisted on the user row. The
    // cookie is set by /r/[code]. Keep this in sync with auth.cli.ts so the
    // CLI generates the matching column.
    user: {
      additionalFields: {
        referredByCode: { type: 'string', required: false, input: false }
      }
    },
    databaseHooks: {
      user: {
        create: {
          before: async (data, ctx) => {
            const cookieHeader = ctx?.request?.headers?.get?.('cookie') ?? ''
            const m = cookieHeader.match(/(?:^|;\s*){{APP_REF_COOKIE}}=([^;]+)/)
            const refCode = m?.[1] ? decodeURIComponent(m[1]) : null
            if (!refCode) return { data }
            return { data: { ...data, referredByCode: refCode } }
          }
        }
      }
    },

    plugins: [
      magicLink({
        expiresIn: 60 * 15,                          // 15-minute link
        sendMagicLink: async ({ email, url }) => {
          // Transactional — sendEmail performs no audience check, which is
          // correct here: a login link must never be suppressed by a
          // marketing/product preference toggle.
          await sendEmail(event, {
            emailId: 'magic-link',
            to: email,
            props: { url }
          })
        }
      }),

      // Stripe billing plugin (built above, only when STRIPE_SECRET_KEY is set).
      ...stripePlugins
    ]
  }

  return betterAuth(options)
}

export type ServerAuth = ReturnType<typeof serverAuth>
