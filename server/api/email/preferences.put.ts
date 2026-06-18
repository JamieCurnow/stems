import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { readZodBody } from '~~/server/utils/validation'
import { ensureEmailPreferences } from '~~/server/utils/email'
import * as schema from '~~/server/db/schema'

// `transactionalEnabled` is intentionally absent — those always send.
const bodySchema = z
  .object({
    marketingEnabled: z.boolean(),
    productEnabled: z.boolean()
  })
  .partial()

/**
 * Update the active user's per-category email preferences.
 * `transactionalEnabled` is intentionally not editable here — those
 * (receipts, cancellation confirmations, sign-in links) always send.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)
  await ensureEmailPreferences(db, user.id)
  const body = await readZodBody(event, bodySchema)

  const updates: Partial<schema.EmailPreferencesRow> = { ...body, updatedAt: new Date() }

  await db.update(schema.emailPreferences).set(updates).where(eq(schema.emailPreferences.userId, user.id))

  const prefs = await db.query.emailPreferences.findFirst({
    where: eq(schema.emailPreferences.userId, user.id)
  })
  return {
    marketingEnabled: prefs?.marketingEnabled ?? true,
    productEnabled: prefs?.productEnabled ?? true,
    transactionalEnabled: prefs?.transactionalEnabled ?? true
  }
})
