import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { profile } from '~~/server/db/schema'
import { normaliseHandle, validateHandle } from '~~/shared/utils/handle'

/**
 * Live availability check for the onboarding handle claim.
 *
 * Auth-gated to limit enumeration abuse. Returns `{ available, error? }`:
 * format/reserved problems come back as `error`; an already-taken handle is
 * simply `available: false` with no error so the UI can show a neutral message.
 * The canonical claim is still re-validated and race-guarded in POST /api/profile.
 */
export default defineEventHandler(async (event) => {
  await requireUser(event)

  const raw = getQuery(event).handle
  if (typeof raw !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing handle' })
  }

  const error = validateHandle(raw)
  if (error) return { available: false, error }

  const db = useDb(event)
  const handle = normaliseHandle(raw)
  const existing = await db
    .select({ userId: profile.userId })
    .from(profile)
    .where(eq(profile.handle, handle))
    .get()

  return { available: !existing }
})
