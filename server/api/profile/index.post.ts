import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { readZodBody } from '~~/server/utils/validation'
import { profileCreateSchema } from '~~/server/utils/profileSchemas'
import { profile } from '~~/server/db/schema'

/**
 * Create the signed-in user's profile during onboarding.
 *
 * The PK is `userId` (no generated id), so a second insert for the same user
 * fails the PK constraint — we treat that, and a handle collision, as a 409.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)

  // One profile per user: bail early if they've already onboarded.
  const existing = await db
    .select({ userId: profile.userId })
    .from(profile)
    .where(eq(profile.userId, user.id))
    .get()
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'You already have a profile' })
  }

  const { handle, farmName, locationName, postcode, isGrower } = await readZodBody(event, profileCreateSchema)

  // Re-check availability before the insert for a friendlier error than the
  // raw constraint failure (the unique index is still the source of truth).
  const handleTaken = await db
    .select({ userId: profile.userId })
    .from(profile)
    .where(eq(profile.handle, handle))
    .get()
  if (handleTaken) {
    throw createError({ statusCode: 409, statusMessage: 'That username was just taken' })
  }

  const now = new Date()
  try {
    const created = await db
      .insert(profile)
      .values({
        userId: user.id,
        handle,
        farmName,
        locationName,
        postcode,
        isGrower,
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get()
    return created
  } catch (err) {
    // Race: someone claimed the handle (or this user double-submitted) between
    // the checks above and the insert. SQLite surfaces a UNIQUE/PK violation.
    const message = err instanceof Error ? err.message : String(err)
    if (/unique|constraint/i.test(message)) {
      throw createError({ statusCode: 409, statusMessage: 'That username was just taken' })
    }
    throw err
  }
})
