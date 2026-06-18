import { and, eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import * as schema from '~~/server/db/schema'
import { ACTIVE_STATUSES } from '~~/server/utils/requireActiveSubscription'
import { PLAN_SLUG } from '~~/shared/utils/constants'

/**
 * Returns the current user's subscription summary so the frontend can route
 * (active → /app, missing → /billing) without paying for an extra Stripe
 * round-trip on every navigation.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)

  const sub = await db.query.subscription.findFirst({
    where: and(eq(schema.subscription.referenceId, user.id), eq(schema.subscription.plan, PLAN_SLUG))
  })

  // Stripe cancels mid-trial set `cancel_at` (timestamp) rather than
  // `cancel_at_period_end: true` — trust either as "pending cancel".
  const cancelAt = sub?.cancelAt ?? null
  const cancelAtPeriodEnd = !!sub?.cancelAtPeriodEnd
  return {
    hasSubscription: !!sub,
    isActive: !!sub && (ACTIVE_STATUSES as readonly string[]).includes(sub.status),
    status: sub?.status ?? null,
    periodEnd: sub?.periodEnd ?? null,
    trialEnd: sub?.trialEnd ?? null,
    cancelAtPeriodEnd,
    cancelAt,
    pendingCancel: cancelAtPeriodEnd || !!cancelAt
  }
})
