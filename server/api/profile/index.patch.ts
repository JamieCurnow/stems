import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { readZodBody } from '~~/server/utils/validation'
import { profilePatchSchema } from '~~/server/utils/profileSchemas'
import { profile } from '~~/server/db/schema'

/**
 * Partial update of the signed-in user's profile (doc 05). Accepts any subset
 * of the editable fields; unknown keys are stripped by the schema. The handle
 * is intentionally NOT editable in V1 — renaming would break shared links.
 *
 * Validation is `profilePatchSchema` (`.partial()`), so only the keys present
 * in the body appear in the parsed result — including a key set explicitly to
 * `null`, which clears the column. `updatedAt` is bumped on every save.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)

  // Must already be onboarded — otherwise there's nothing to patch.
  const existing = await db.select().from(profile).where(eq(profile.userId, user.id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
  }

  const updates = await readZodBody(event, profilePatchSchema)

  // No recognised fields → nothing to do; return the row unchanged.
  if (Object.keys(updates).length === 0) {
    return existing
  }

  const updated = await db
    .update(profile)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(profile.userId, user.id))
    .returning()
    .get()

  return updated
})
