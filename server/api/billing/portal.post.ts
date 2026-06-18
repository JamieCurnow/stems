import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { useStripe } from '~~/server/utils/stripe'
import * as schema from '~~/server/db/schema'

/**
 * Create a Stripe Customer Portal session and return the URL. The client
 * follows it for any subscription self-service: change card, cancel,
 * download invoices, redeem promo codes mid-cycle.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)
  const stripe = useStripe(event)

  const userRow = await db.query.user.findFirst({ where: eq(schema.user.id, user.id) })
  const customerId = (userRow as { stripeCustomerId?: string } | undefined)?.stripeCustomerId
  if (!customerId) {
    throw createError({ statusCode: 400, statusMessage: 'No Stripe customer for this user yet' })
  }

  const origin = getRequestURL(event).origin
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/billing`
  })
  return { url: session.url }
})
