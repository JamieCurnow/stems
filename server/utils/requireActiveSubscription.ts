import type { H3Event } from 'h3'
import { and, eq, inArray } from 'drizzle-orm'
import { useDb } from './db'
import { requireUser } from './requireUser'
import * as schema from '../db/schema'
import { PLAN_SLUG } from '~~/shared/utils/constants'

export const ACTIVE_STATUSES = ['active', 'trialing'] as const

/**
 * Resolves the current user AND verifies they have an active or trialing
 * subscription on the configured plan. Throws 401 if signed-out, 402 if
 * signed-in but unsubscribed (matches Stripe's "Payment Required" code so
 * the frontend can route to /billing).
 */
export const requireActiveSubscription = async (event: H3Event) => {
  const user = await requireUser(event)
  const db = useDb(event)
  const sub = await db.query.subscription.findFirst({
    where: and(
      eq(schema.subscription.referenceId, user.id),
      eq(schema.subscription.plan, PLAN_SLUG),
      inArray(schema.subscription.status, [...ACTIVE_STATUSES])
    )
  })
  if (!sub) {
    throw createError({ statusCode: 402, statusMessage: 'Subscription required' })
  }
  return { user, subscription: sub }
}
