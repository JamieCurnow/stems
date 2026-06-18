import { z } from 'zod'
import { normaliseHandle, validateHandle } from '~~/shared/utils/handle'

/**
 * Zod schemas for the profile create (onboarding) + patch (edit) endpoints.
 * Shared so the two handlers stay in lock-step and the bespoke field rules
 * (handle, Instagram, website, WhatsApp, contact email) live in one place.
 *
 * `profileCreateSchema` requires handle + farmName; `profilePatchSchema` is
 * `.partial()`, so only the keys present in the PATCH body are touched —
 * including a key explicitly set to `null` (which clears the column). Absent
 * keys never appear in the parsed result. The client mirrors these rules for
 * inline validation (see app/pages/onboarding.vue + account/edit.vue).
 */

/** Trim a string, blank → null; pass null/undefined through as null. */
const optionalText = z
  .preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().nullish())
  .transform((v) => (v == null || v === '' ? null : v))

/** Farm/display name: 1–80 chars after trimming. */
const farmName = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z
    .string({ error: 'A farm name of 1–80 characters is required.' })
    .min(1, 'A farm name of 1–80 characters is required.')
    .max(80, 'A farm name of 1–80 characters is required.')
)

/** Handle: validated via shared `validateHandle`, then normalised to canonical. */
const handle = z
  .string({ error: 'A username is required.' })
  .superRefine((val, ctx) => {
    const err = validateHandle(val)
    if (err) ctx.addIssue({ code: 'custom', message: err })
  })
  .transform((val) => normaliseHandle(val))

/** Bio: optional, ≤1000 chars, blank → null. */
const bio = z
  .preprocess(
    (v) => (typeof v === 'string' ? v.trim() : v),
    z.string().max(1000, 'Your bio must be 1000 characters or fewer.').nullish()
  )
  .transform((v) => (v == null || v === '' ? null : v))

/** Instagram handle: strip a leading @, enforce charset + length, blank → null. */
const instagram = z
  .preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().nullish())
  .transform((v, ctx) => {
    if (v == null || v === '') return null
    const h = v.replace(/^@/, '')
    if (!/^[A-Za-z0-9._]+$/.test(h)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Instagram handle can only contain letters, numbers, dots and underscores.'
      })
      return z.NEVER
    }
    if (h.length > 30) {
      ctx.addIssue({ code: 'custom', message: 'That Instagram handle is too long.' })
      return z.NEVER
    }
    return h
  })

/** Website: normalise to an http(s) URL, blank → null. */
const website = z
  .preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().nullish())
  .transform((v, ctx) => {
    if (v == null || v === '') return null
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`
    let parsed: URL
    try {
      parsed = new URL(withScheme)
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Please enter a valid website URL.' })
      return z.NEVER
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      ctx.addIssue({ code: 'custom', message: 'Please enter a valid website URL.' })
      return z.NEVER
    }
    return parsed.toString()
  })

/** WhatsApp number: keep the grower's formatting, sanity-check 7–15 digits. */
const whatsapp = z
  .preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().nullish())
  .transform((v, ctx) => {
    if (v == null || v === '') return null
    const digits = v.replace(/\D/g, '')
    if (digits.length < 7 || digits.length > 15) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a valid WhatsApp number, including the country code.'
      })
      return z.NEVER
    }
    return v
  })

/** Public contact email, blank → null. */
const contactEmail = z
  .preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().nullish())
  .transform((v, ctx) => {
    if (v == null || v === '') return null
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      ctx.addIssue({ code: 'custom', message: 'Please enter a valid contact email.' })
      return z.NEVER
    }
    return v
  })

/** Preferred contact method: one of the supported channels, or null. */
const preferredContact = z
  .preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().nullish())
  .transform((v, ctx) => {
    if (v == null || v === '') return null
    if (!['whatsapp', 'email', 'instagram'].includes(v)) {
      ctx.addIssue({ code: 'custom', message: 'Invalid preferred contact method.' })
      return z.NEVER
    }
    return v
  })

/** Onboarding: claim a handle + create the profile row. */
export const profileCreateSchema = z.object({
  handle,
  farmName,
  locationName: optionalText,
  postcode: optionalText,
  // Default on; only an explicit `false` opts out of being a grower.
  isGrower: z
    .boolean()
    .optional()
    .transform((v) => v !== false)
})

/** Profile edit: every field optional; the handle is intentionally not editable. */
export const profilePatchSchema = z
  .object({
    farmName,
    bio,
    locationName: optionalText,
    postcode: optionalText,
    instagram,
    website,
    whatsapp,
    contactEmail,
    preferredContact,
    avatarKey: optionalText,
    bannerKey: optionalText,
    isGrower: z.boolean({ error: 'isGrower must be a boolean.' })
  })
  .partial()
