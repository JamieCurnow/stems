import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { ensureEmailPreferences } from '~~/server/utils/email'

/**
 * Read the active user's email preferences (creates them lazily if missing,
 * so the response always has a fresh unsubscribe token).
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)
  const prefs = await ensureEmailPreferences(db, user.id)
  return {
    marketingEnabled: prefs.marketingEnabled,
    productEnabled: prefs.productEnabled,
    transactionalEnabled: prefs.transactionalEnabled
  }
})
