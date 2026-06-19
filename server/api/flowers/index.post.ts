import { eq, max } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '~~/server/utils/db'
import type { Db } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { readZodBody } from '~~/server/utils/validation'
import { imgUrl } from '~~/server/utils/img'
import { flower, flowerPhoto, type FlowerRow } from '~~/server/db/schema'
import { bunchPrice } from '~~/shared/utils/price'
import { AVAILABILITY_STATUS_VALUES, MAX_STEMS_AVAILABLE } from '~~/shared/utils/flowers'
import type { AvailabilityStatus } from '~~/shared/utils/flowers'
import type { FlowerDto } from '~~/shared/types/flower'

/* ── Shared flower validation (also imported by [id].patch.ts) ────────────────
   Zod schemas, not hand-rolled coercion. Prices are integer pence end-to-end:
   the client converts at the <input> boundary, so the server rejects
   non-integers. Optional text trims and treats blank as null; ints accept a
   blank string / null as "unset". */

const MAX_PRICE_PENCE = 1_000_000 // £10,000
const MAX_STEM_LENGTH = 300 // cm
const MAX_STEMS_PER_BUNCH = 1000
const MAX_NOTES = 300
const MAX_NAME = 120
const MAX_TEXT = 120

/** Optional free text: trims, blank → null, enforces a max length. */
const optionalText = (label: string, maxLen = MAX_TEXT) =>
  z
    .preprocess(
      (v) => (typeof v === 'string' ? v.trim() : v),
      z
        .string({ error: `${label} must be text` })
        .max(maxLen, `${label} is too long (max ${maxLen})`)
        .nullish()
    )
    .transform((v) => (v == null || v === '' ? null : v))

/** Required free text: trims, must be non-empty within the max length. */
const requiredText = (label: string, maxLen = MAX_NAME) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() : v),
    z
      .string({ error: `${label} is required` })
      .min(1, `${label} is required`)
      .max(maxLen, `${label} is too long (max ${maxLen})`)
  )

/** Optional whole number ≥ 0: blank string / null → null. */
const optionalInt = (label: string, maxVal: number) =>
  z.preprocess(
    (v) => (v === '' || v == null ? null : v),
    z
      .number({ error: `${label} must be a whole number` })
      .int(`${label} must be a whole number`)
      .min(0, `${label} cannot be negative`)
      .max(maxVal, `${label} is too large`)
      .nullable()
  )

/** Boolean flag (absent/null → false). */
const boolFlag = (label: string) =>
  z.preprocess((v) => v ?? false, z.boolean({ error: `${label} must be true or false` }))

/** Optional categorical availability status: blank string / null → null. */
const availabilityStatusSchema = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  z.enum(AVAILABILITY_STATUS_VALUES, { error: 'Invalid availability status' }).nullable()
)

/** A list of R2 photo keys; each must start with `public/` (absent → []). */
const photoKeysSchema = z.preprocess(
  (v) => v ?? [],
  z.array(
    z.string().refine((k) => k.startsWith('public/'), 'Invalid photo key'),
    {
      error: 'photoKeys must be an array'
    }
  )
)

/* The editable fields of a flower. `flowerCreateSchema` requires `name` and
   defaults absent optionals; `flowerPatchSchema` is `.partial()` so only the
   keys actually present in the PATCH body are touched. */
const editableFlowerShape = {
  name: requiredText('Name'),
  variety: optionalText('Variety'),
  color: optionalText('Colour'),
  stemLengthCm: optionalInt('Stem length', MAX_STEM_LENGTH),
  stemsPerBunch: optionalInt('Stems per bunch', MAX_STEMS_PER_BUNCH),
  pricePerStem: optionalInt('Price per stem', MAX_PRICE_PENCE),
  pricePerBunch: optionalInt('Price per bunch', MAX_PRICE_PENCE),
  openToOffers: boolFlag('Open to offers'),
  notes: optionalText('Notes', MAX_NOTES),
  availabilityStatus: availabilityStatusSchema,
  stemsAvailable: optionalInt('Stems available', MAX_STEMS_AVAILABLE),
  photoKeys: photoKeysSchema
}

export const flowerCreateSchema = z.object(editableFlowerShape)
export const flowerPatchSchema = z.object(editableFlowerShape).partial()

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
  availabilityStatus: row.availabilityStatus as AvailabilityStatus | null,
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

  const { photoKeys, ...fields } = await readZodBody(event, flowerCreateSchema)

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
      ...fields,
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
