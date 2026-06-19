import type Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { useStripe, stripeCryptoProvider } from '~~/server/utils/stripe'
import { useDb } from '~~/server/utils/db'
import { grantReferrerReward } from '~~/server/utils/referrals'
import * as schema from '~~/server/db/schema'

/**
 * Custom webhook for app-specific side effects. Better Auth's stripe plugin
 * owns /api/auth/stripe/webhook and handles the bulk of subscription state.
 * This endpoint reacts to events we need to act on independently:
 *
 *   `invoice.paid` (subscription_cycle) — credit the referrer's customer
 *                                          balance when a referee pays their
 *                                          first non-trial invoice.
 *
 * Verification uses Stripe's async constructEvent (Cloudflare Workers don't
 * have Node `crypto`, only SubtleCrypto).
 */
export default defineEventHandler(async (event) => {
  const env = event.context.cloudflare?.env
  if (!env) throw createError({ statusCode: 500, statusMessage: 'No cloudflare env' })

  const signature = getHeader(event, 'stripe-signature')
  if (!signature) throw createError({ statusCode: 400, statusMessage: 'Missing stripe-signature' })

  const rawBody = await readRawBody(event, false)
  if (!rawBody) throw createError({ statusCode: 400, statusMessage: 'Empty body' })
  const bodyString = typeof rawBody === 'string' ? rawBody : new TextDecoder().decode(rawBody)

  const stripe = useStripe(event)
  let stripeEvent: Stripe.Event
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(
      bodyString,
      signature,
      env.STRIPE_REFERRAL_WEBHOOK_SECRET,
      undefined,
      stripeCryptoProvider
    )
  } catch (err) {
    throw createError({
      statusCode: 400,
      statusMessage: `Signature verification failed: ${(err as Error).message}`
    })
  }

  if (stripeEvent.type === 'invoice.paid') {
    const invoice = stripeEvent.data.object as Stripe.Invoice
    // Only second invoice onward — the first invoice on a trial sub is the
    // £0 trial-start invoice, which we ignore.
    if (invoice.billing_reason !== 'subscription_cycle') {
      return { received: true, skipped: 'not subscription_cycle' }
    }

    // Stripe API v2026-04-22 (dahlia) moved Invoice.subscription to
    // Invoice.parent.subscription_details.subscription.
    const parentSub = invoice.parent?.subscription_details?.subscription
    const subId = typeof parentSub === 'string' ? parentSub : parentSub?.id
    if (!subId) return { received: true, skipped: 'no subscription id' }

    const db = useDb(event)
    const subRow = await db.query.subscription.findFirst({
      where: eq(schema.subscription.stripeSubscriptionId, subId)
    })
    if (!subRow) return { received: true, skipped: 'no local sub row' }

    const grant = await grantReferrerReward({
      refereeUserId: subRow.referenceId,
      refereeStripeSubscriptionId: subId,
      db,
      stripe
    })

    // TODO(posthog): capture a 'purchase' conversion here. Every `invoice.paid`
    // with `subscription_cycle` is a paid cycle; dedupe on transaction_id
    // (invoice.id), include value (invoice.amount_paid / 100), currency, and
    // referral_redeemed when `grant?.granted`.

    // Hook in your other post-payment side-effects here. E.g.:
    //   await maybeSendPostPayment(event, subRow.referenceId)
    //   await cancelScheduledEmails(event, { userId: subRow.referenceId, dedupePrefix: 'trial-' })
  }

  // Trial-start conversion. `customer.subscription.created` with status=trialing
  // fires once per subscription.
  // TODO(posthog): capture a 'trial_start' conversion here — look up the local
  // subscription row by sub.id for the userId, transaction_id = sub.id.

  // Cancellation flow — trigger your cancellation-confirmed email and any
  // win-back drip. Stripe sets `cancel_at_period_end` for paid cancels and
  // a `cancel_at` timestamp for trial cancels — treat either as pending.
  if (
    stripeEvent.type === 'customer.subscription.updated' ||
    stripeEvent.type === 'customer.subscription.deleted'
  ) {
    const sub = stripeEvent.data.object as Stripe.Subscription
    const isCancellation =
      stripeEvent.type === 'customer.subscription.deleted' ||
      sub.cancel_at_period_end === true ||
      sub.cancel_at != null

    if (isCancellation) {
      // TODO(posthog): capture 'subscription_cancelled' (transaction_id = sub.id).
      // Look up the local subscription row by sub.id for the userId when you
      // also wire the cancellation-confirmed email + any win-back drip.
      // await maybeSendCancellation(event, sub)
    } else if (stripeEvent.type === 'customer.subscription.updated') {
      // Only treat this as a reactivation if the previous version of the sub
      // was pending cancellation (cancel_at_period_end true OR cancel_at set)
      // and now isn't. Without checking previous_attributes we'd fire
      // `subscription_reactivated` on every unrelated update (payment-method
      // changes, trial-to-active transitions, plan upgrades).
      const prev = (stripeEvent.data as { previous_attributes?: Partial<Stripe.Subscription> })
        .previous_attributes
      const wasPendingCancel = prev?.cancel_at_period_end === true || prev?.cancel_at != null
      if (wasPendingCancel) {
        // TODO(posthog): capture 'subscription_reactivated' (transaction_id = sub.id).
        // await cancelScheduledEmails(event, { userId, dedupePrefix: 'winback-' })
      }
    }
  }

  return { received: true }
})
