import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { ensureEmailPreferences } from '~~/server/utils/email'
import * as schema from '~~/server/db/schema'

interface Body {
  marketingEnabled?: boolean
  productEnabled?: boolean
}

/**
 * Update the active user's per-category email preferences.
 * `transactionalEnabled` is intentionally not editable here — those
 * (receipts, cancellation confirmations, sign-in links) always send.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)
  await ensureEmailPreferences(db, user.id)
  const body = await readBody<Body>(event)

  const updates: Partial<schema.EmailPreferencesRow> = { updatedAt: new Date() }
  if (typeof body.marketingEnabled === 'boolean') updates.marketingEnabled = body.marketingEnabled
  if (typeof body.productEnabled === 'boolean') updates.productEnabled = body.productEnabled

  await db
    .update(schema.emailPreferences)
    .set(updates)
    .where(eq(schema.emailPreferences.userId, user.id))

  const prefs = await db.query.emailPreferences.findFirst({
    where: eq(schema.emailPreferences.userId, user.id)
  })
  return {
    marketingEnabled: prefs?.marketingEnabled ?? true,
    productEnabled: prefs?.productEnabled ?? true,
    transactionalEnabled: prefs?.transactionalEnabled ?? true
  }
})
