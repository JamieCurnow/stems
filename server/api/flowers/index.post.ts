import { eq, max } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import type { Db } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { imgUrl } from '~~/server/utils/img'
import { flower, flowerPhoto, type FlowerRow } from '~~/server/db/schema'
import { bunchPrice } from '~~/shared/utils/price'
import { MAX_STEMS_AVAILABLE } from '~~/shared/utils/flowers'
import type { FlowerDto } from '~~/shared/types/flower'

/* ── Shared validation/coercion (also imported by [id].patch.ts) ──────────────
   Manual guards, no zod (per roadmap). Prices are integer pence end-to-end:
   the client converts at the <input> boundary, so the server rejects
   non-integers. */

const MAX_PRICE_PENCE = 1_000_000 // £10,000
const MAX_STEM_LENGTH = 300 // cm
const MAX_STEMS_PER_BUNCH = 1000
const MAX_NOTES = 300
const MAX_NAME = 120
const MAX_TEXT = 120

export const coerceText = (v: unknown, field: string, maxLen = MAX_TEXT): string | null => {
  if (v == null) return null
  if (typeof v !== 'string') {
    throw createError({ statusCode: 400, statusMessage: `${field} must be text` })
  }
  const t = v.trim()
  if (!t.length) return null
  if (t.length > maxLen) {
    throw createError({ statusCode: 400, statusMessage: `${field} is too long (max ${maxLen})` })
  }
  return t
}

export const coerceRequiredText = (v: unknown, field: string, maxLen = MAX_NAME): string => {
  const t = coerceText(v, field, maxLen)
  if (!t) throw createError({ statusCode: 400, statusMessage: `${field} is required` })
  return t
}

export const coerceInt = (v: unknown, field: string, maxVal: number): number | null => {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw createError({ statusCode: 400, statusMessage: `${field} must be a whole number` })
  }
  if (n < 0) throw createError({ statusCode: 400, statusMessage: `${field} cannot be negative` })
  if (n > maxVal) throw createError({ statusCode: 400, statusMessage: `${field} is too large` })
  return n
}

// Boolean flags: accept a real boolean (absent/null → false).
export const coerceBool = (v: unknown, field: string): boolean => {
  if (v == null) return false
  if (typeof v !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: `${field} must be true or false` })
  }
  return v
}

export const coerceStemLength = (v: unknown) => coerceInt(v, 'Stem length', MAX_STEM_LENGTH)
export const coerceStemsPerBunch = (v: unknown) => coerceInt(v, 'Stems per bunch', MAX_STEMS_PER_BUNCH)
export const coercePrice = (v: unknown, field: string) => coerceInt(v, field, MAX_PRICE_PENCE)
export const coerceNotes = (v: unknown) => coerceText(v, 'Notes', MAX_NOTES)

// Stems available: null (absent/blank) = "Available", 0 = sold out, >0 = count.
export const coerceStemsAvailable = (v: unknown) => coerceInt(v, 'Stems available', MAX_STEMS_AVAILABLE)

/** Validate a list of R2 photo keys; each must start with `public/`. */
export const coercePhotoKeys = (v: unknown): string[] => {
  if (v == null) return []
  if (!Array.isArray(v)) {
    throw createError({ statusCode: 400, statusMessage: 'photoKeys must be an array' })
  }
  return v.map((k) => {
    if (typeof k !== 'string' || !k.startsWith('public/')) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid photo key' })
    }
    return k
  })
}

/** Build the DTO returned by create/update from a row + its photo keys. */
export const toFlowerDto = (row: FlowerRow, photoKeys: string[]): FlowerDto => ({
  id: row.id,
  name: row.name,
  variety: row.variety,
  color: row.color,
  stemLengthCm: row.stemLengthCm,
  stemsPerBunch: row.stemsPerBunch,
  pricePerStem: row.pricePerStem,
  pricePerBunch: bunchPrice(row),
  openToOffers: row.openToOffers,
  stemsAvailable: row.stemsAvailable,
  notes: row.notes,
  sortOrder: row.sortOrder,
  photoUrls: photoKeys.map((k) => imgUrl(k)).filter((u): u is string => u != null),
  updatedAt: row.updatedAt.getTime()
})

/** Read a flower's photo keys in display order (primary first). */
export const loadPhotoKeys = async (db: Db, flowerId: string): Promise<string[]> => {
  const photos = await db
    .select({ r2Key: flowerPhoto.r2Key })
    .from(flowerPhoto)
    .where(eq(flowerPhoto.flowerId, flowerId))
    .orderBy(flowerPhoto.sortOrder)
    .all()
  return photos.map((p) => p.r2Key)
}

/**
 * POST /api/flowers — create a flower for the signed-in grower.
 * id = crypto.randomUUID(); sortOrder = max+1; createdAt/updatedAt = now.
 * Attaches uploaded photo keys → flower_photo rows.
 */
export default defineEventHandler(async (event): Promise<FlowerDto> => {
  const user = await requireUser(event)
  const db = useDb(event)

  const body = (await readBody(event)) as Record<string, unknown>

  const name = coerceRequiredText(body.name, 'Name')
  const variety = coerceText(body.variety, 'Variety')
  const color = coerceText(body.color, 'Colour')
  const stemLengthCm = coerceStemLength(body.stemLengthCm)
  const stemsPerBunch = coerceStemsPerBunch(body.stemsPerBunch)
  const pricePerStem = coercePrice(body.pricePerStem, 'Price per stem')
  const pricePerBunch = coercePrice(body.pricePerBunch, 'Price per bunch')
  const openToOffers = coerceBool(body.openToOffers, 'Open to offers')
  const notes = coerceNotes(body.notes)
  const stemsAvailable = coerceStemsAvailable(body.stemsAvailable)
  const photoKeys = coercePhotoKeys(body.photoKeys)

  // sortOrder = max+1 for this grower (so new flowers land at the bottom).
  const maxRow = await db
    .select({ value: max(flower.sortOrder) })
    .from(flower)
    .where(eq(flower.growerId, user.id))
    .get()
  const sortOrder = (maxRow?.value ?? -1) + 1

  const now = new Date()
  const id = crypto.randomUUID()

  const created = await db
    .insert(flower)
    .values({
      id,
      growerId: user.id,
      name,
      variety,
      color,
      stemLengthCm,
      stemsPerBunch,
      pricePerStem,
      pricePerBunch,
      openToOffers,
      stemsAvailable,
      notes,
      sortOrder,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    })
    .returning()
    .get()

  if (photoKeys.length) {
    await db.insert(flowerPhoto).values(
      photoKeys.map((r2Key, i) => ({
        id: crypto.randomUUID(),
        flowerId: id,
        r2Key,
        sortOrder: i,
        createdAt: now
      }))
    )
  }

  return toFlowerDto(created, photoKeys)
})
