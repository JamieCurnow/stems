import type Stripe from 'stripe'
import { and, eq, isNull, sql } from 'drizzle-orm'
import * as schema from '../db/schema'
import type { Db } from './db'
import { REFERRAL_REWARD_CAP } from '~~/shared/utils/constants'

/**
 * Referral code format: 4-char user-stem + 4-char random suffix, joined
 * by a hyphen, uppercased. Stripe Promotion Codes must be unique within
 * an account so we re-roll on collision.
 */
const SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateReferralCode(stem: string): string {
  const cleaned = stem.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  const fallback = cleaned.length >= 3 ? cleaned : 'CODE'
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)]
  }
  return `${fallback}-${suffix}`
}

const uuid = () => crypto.randomUUID()

interface EnsureCodeArgs {
  userId: string
  db: Db
  stripe: Stripe
  couponId: string
}

/**
 * Idempotently provision a referral code + matching Stripe Promotion Code
 * for a user. Called from onSubscriptionComplete so codes exist as soon
 * as a user starts a trial.
 */
export async function ensureUserHasReferralCode({
  userId,
  db,
  stripe,
  couponId
}: EnsureCodeArgs): Promise<schema.ReferralRow> {
  const existing = await db.query.referral.findFirst({
    where: eq(schema.referral.referrerId, userId)
  })
  if (existing) return existing

  const stem = userId.slice(0, 6)

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode(stem)
    try {
      const promo = await stripe.promotionCodes.create({
        // Newer Stripe SDK shape: { promotion: { type: 'coupon', coupon } }
        promotion: { type: 'coupon', coupon: couponId },
        code,
        metadata: { referrerUserId: userId }
      })

      const row: schema.ReferralRow = {
        id: uuid(),
        referrerId: userId,
        code,
        stripePromotionCodeId: promo.id,
        rewardMonthsGranted: 0,
        createdAt: Date.now()
      }
      await db.insert(schema.referral).values(row)
      return row
    } catch (err: unknown) {
      const isCollision =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === 'resource_already_exists'
      if (!isCollision) throw err
      // try again with a different suffix
    }
  }
  throw new Error('Failed to allocate a unique referral code after 5 attempts')
}

interface RecordRedemptionArgs {
  refereeUserId: string
  referralCode: string
  refereeStripeSubscriptionId: string
  db: Db
}

/**
 * Log that a referee has subscribed using a referral code. The referrer
 * isn't credited yet — we wait for invoice.paid on a non-trial invoice
 * to confirm they actually pay.
 */
export async function recordReferralRedemption({
  refereeUserId,
  referralCode,
  refereeStripeSubscriptionId,
  db
}: RecordRedemptionArgs) {
  const referral = await db.query.referral.findFirst({
    where: eq(schema.referral.code, referralCode)
  })
  if (!referral) return

  const existing = await db.query.referralRedemption.findFirst({
    where: eq(schema.referralRedemption.refereeUserId, refereeUserId)
  })
  if (existing) return

  await db.insert(schema.referralRedemption).values({
    id: uuid(),
    referralId: referral.id,
    refereeUserId,
    refereeStripeSubscriptionId,
    rewardGrantedAt: null,
    createdAt: Date.now()
  })
}

interface GrantRewardArgs {
  refereeUserId: string
  refereeStripeSubscriptionId: string
  db: Db
  stripe: Stripe
}

/**
 * Credit the referrer's Stripe customer balance with one free month, up to
 * the lifetime REFERRAL_REWARD_CAP. Idempotent via:
 *   1. Stripe idempotencyKey keyed on the redemption row id (Stripe dedupes).
 *   2. Atomic CAS on rewardGrantedAt (only the writer that flips NULL → ts
 *      gets to bump the referrer's lifetime counter).
 */
export async function grantReferrerReward({
  refereeUserId,
  refereeStripeSubscriptionId,
  db,
  stripe
}: GrantRewardArgs) {
  const redemption = await db.query.referralRedemption.findFirst({
    where: eq(schema.referralRedemption.refereeUserId, refereeUserId)
  })
  if (!redemption || redemption.rewardGrantedAt) return

  const referral = await db.query.referral.findFirst({
    where: eq(schema.referral.id, redemption.referralId)
  })
  if (!referral) return

  if (referral.rewardMonthsGranted >= REFERRAL_REWARD_CAP) {
    // Cap reached — claim the redemption so we don't re-check, but skip the
    // credit. Conditional update is harmless if a concurrent caller already
    // claimed it.
    await db
      .update(schema.referralRedemption)
      .set({ rewardGrantedAt: Date.now() })
      .where(
        and(
          eq(schema.referralRedemption.id, redemption.id),
          isNull(schema.referralRedemption.rewardGrantedAt)
        )
      )
    return
  }

  const referrer = await db.query.user.findFirst({
    where: eq(schema.user.id, referral.referrerId)
  })
  const referrerStripeCustomerId = (referrer as { stripeCustomerId?: string } | undefined)
    ?.stripeCustomerId
  if (!referrerStripeCustomerId) return

  // Idempotency key keyed on redemption.id — concurrent webhook deliveries
  // and post-credit DB-failure retries all hit the same key, so Stripe
  // returns the cached balance transaction instead of creating a second.
  await stripe.customers.createBalanceTransaction(
    referrerStripeCustomerId,
    {
      amount: -500,                                  // £/$5.00 — adjust per your plan
      currency: 'usd',                               // adjust per your plan
      description: `Referral credit (sub ${refereeStripeSubscriptionId})`
    },
    { idempotencyKey: `referral-reward-${redemption.id}` }
  )

  // Atomic CAS: only the writer that flips rewardGrantedAt from NULL is
  // allowed to bump the referrer's lifetime counter. Concurrent invocations
  // see 0 affected rows and skip the increment, keeping the cap honest.
  const claimed = await db
    .update(schema.referralRedemption)
    .set({ rewardGrantedAt: Date.now() })
    .where(
      and(
        eq(schema.referralRedemption.id, redemption.id),
        isNull(schema.referralRedemption.rewardGrantedAt)
      )
    )
    .returning({ id: schema.referralRedemption.id })

  if (claimed.length === 0) return

  await db
    .update(schema.referral)
    .set({ rewardMonthsGranted: sql`${schema.referral.rewardMonthsGranted} + 1` })
    .where(eq(schema.referral.id, referral.id))

  return {
    granted: true as const,
    referrerUserId: referral.referrerId,
    refereeUserId
  }
}
