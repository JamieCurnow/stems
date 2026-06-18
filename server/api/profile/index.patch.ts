import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { profile } from '~~/server/db/schema'

/**
 * Partial update of the signed-in user's profile (doc 05). Accepts any subset
 * of the editable fields; unknown keys are ignored. The handle is intentionally
 * NOT editable in V1 — renaming would break shared links (see the doc).
 *
 * Validation mirrors onboarding (POST): manual guards, no zod (not installed).
 * Strings are trimmed and empty → null; `updatedAt` is bumped on every save.
 */

interface PatchProfileBody {
  farmName?: unknown
  bio?: unknown
  locationName?: unknown
  postcode?: unknown
  instagram?: unknown
  website?: unknown
  whatsapp?: unknown
  contactEmail?: unknown
  preferredContact?: unknown
  avatarKey?: unknown
  bannerKey?: unknown
  isGrower?: unknown
}

const has = (body: object, key: string) => Object.prototype.hasOwnProperty.call(body, key)

// Trim a string; empty → null. Non-strings → null.
const trimmedOrNull = (v: unknown): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)

  // Must already be onboarded — otherwise there's nothing to patch.
  const existing = await db.select().from(profile).where(eq(profile.userId, user.id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
  }

  const body = (await readBody(event)) as PatchProfileBody
  const updates: Partial<typeof profile.$inferInsert> = {}

  if (has(body, 'farmName')) {
    const farmName = trimmedOrNull(body.farmName)
    if (!farmName || farmName.length > 80) {
      throw createError({
        statusCode: 400,
        statusMessage: 'A farm name of 1–80 characters is required.'
      })
    }
    updates.farmName = farmName
  }

  if (has(body, 'bio')) {
    const bio = trimmedOrNull(body.bio)
    if (bio && bio.length > 1000) {
      throw createError({ statusCode: 400, statusMessage: 'Your bio must be 1000 characters or fewer.' })
    }
    updates.bio = bio
  }

  if (has(body, 'locationName')) {
    updates.locationName = trimmedOrNull(body.locationName)
  }

  if (has(body, 'postcode')) {
    updates.postcode = trimmedOrNull(body.postcode)
  }

  if (has(body, 'instagram')) {
    const raw = trimmedOrNull(body.instagram)
    if (raw == null) {
      updates.instagram = null
    } else {
      // Strip a leading @, then enforce the Instagram handle charset.
      const handle = raw.replace(/^@/, '')
      if (!/^[A-Za-z0-9._]+$/.test(handle)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Instagram handle can only contain letters, numbers, dots and underscores.'
        })
      }
      if (handle.length > 30) {
        throw createError({ statusCode: 400, statusMessage: 'That Instagram handle is too long.' })
      }
      updates.instagram = handle
    }
  }

  if (has(body, 'website')) {
    const raw = trimmedOrNull(body.website)
    if (raw == null) {
      updates.website = null
    } else {
      // Normalise to include a scheme, then validate it parses as http(s).
      const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
      let parsed: URL
      try {
        parsed = new URL(withScheme)
      } catch {
        throw createError({ statusCode: 400, statusMessage: 'Please enter a valid website URL.' })
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw createError({ statusCode: 400, statusMessage: 'Please enter a valid website URL.' })
      }
      updates.website = parsed.toString()
    }
  }

  if (has(body, 'whatsapp')) {
    const raw = trimmedOrNull(body.whatsapp)
    if (raw == null) {
      updates.whatsapp = null
    } else {
      // Keep the grower's formatting (we strip to digits at link-build time),
      // but sanity-check there's a plausible international number in there.
      const digits = raw.replace(/\D/g, '')
      if (digits.length < 7 || digits.length > 15) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Enter a valid WhatsApp number, including the country code.'
        })
      }
      updates.whatsapp = raw
    }
  }

  if (has(body, 'contactEmail')) {
    const raw = trimmedOrNull(body.contactEmail)
    if (raw == null) {
      updates.contactEmail = null
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
        throw createError({ statusCode: 400, statusMessage: 'Please enter a valid contact email.' })
      }
      updates.contactEmail = raw
    }
  }

  if (has(body, 'preferredContact')) {
    const raw = trimmedOrNull(body.preferredContact)
    if (raw != null && !['whatsapp', 'email', 'instagram'].includes(raw)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid preferred contact method.' })
    }
    updates.preferredContact = raw
  }

  if (has(body, 'avatarKey')) {
    updates.avatarKey = trimmedOrNull(body.avatarKey)
  }

  if (has(body, 'bannerKey')) {
    updates.bannerKey = trimmedOrNull(body.bannerKey)
  }

  if (has(body, 'isGrower')) {
    if (typeof body.isGrower !== 'boolean') {
      throw createError({ statusCode: 400, statusMessage: 'isGrower must be a boolean.' })
    }
    updates.isGrower = body.isGrower
  }

  // No recognised fields → nothing to do; return the row unchanged.
  if (Object.keys(updates).length === 0) {
    return existing
  }

  // timestamp_ms columns map from a Date.
  updates.updatedAt = new Date()

  const updated = await db.update(profile).set(updates).where(eq(profile.userId, user.id)).returning().get()

  return updated
})
