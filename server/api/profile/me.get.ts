import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { profile } from '~~/server/db/schema'

/**
 * Return the signed-in user's profile row, or `null` if they haven't been
 * through onboarding yet. The onboarding gate (client middleware + the tab
 * bar's `isGrower` flag) keys off this.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)
  const row = await db.select().from(profile).where(eq(profile.userId, user.id)).get()
  return row ?? null
})
