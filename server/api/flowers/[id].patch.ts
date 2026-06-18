import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { flower, flowerPhoto, type FlowerRow } from '~~/server/db/schema'
import {
  coerceBool,
  coerceNotes,
  coercePhotoKeys,
  coercePrice,
  coerceRequiredText,
  coerceStemLength,
  coerceStemsAvailable,
  coerceStemsPerBunch,
  coerceText,
  loadPhotoKeys,
  toFlowerDto
} from './index.post'
import type { FlowerDto } from '~~/shared/types/flower'

/**
 * PATCH /api/flowers/[id] — partial update. Only the keys present in the body
 * are touched, so this cheaply handles the high-frequency stems-available
 * quick update from the list. `updatedAt` ALWAYS bumps (it drives the public
 * "Updated X ago" line). If `photoKeys` is present, the photo set is replaced.
 */
export default defineEventHandler(async (event): Promise<FlowerDto> => {
  const user = await requireUser(event)
  const db = useDb(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing flower id' })

  const existing = await db.select().from(flower).where(eq(flower.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Flower not found' })
  if (existing.growerId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Not your flower' })
  }

  const body = (await readBody(event)) as Record<string, unknown>
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)

  // Build a partial patch — only fields actually supplied.
  const patch: Partial<FlowerRow> = {}
  if (has('name')) patch.name = coerceRequiredText(body.name, 'Name')
  if (has('variety')) patch.variety = coerceText(body.variety, 'Variety')
  if (has('color')) patch.color = coerceText(body.color, 'Colour')
  if (has('stemLengthCm')) patch.stemLengthCm = coerceStemLength(body.stemLengthCm)
  if (has('stemsPerBunch')) patch.stemsPerBunch = coerceStemsPerBunch(body.stemsPerBunch)
  if (has('pricePerStem')) patch.pricePerStem = coercePrice(body.pricePerStem, 'Price per stem')
  if (has('pricePerBunch')) patch.pricePerBunch = coercePrice(body.pricePerBunch, 'Price per bunch')
  if (has('openToOffers')) patch.openToOffers = coerceBool(body.openToOffers, 'Open to offers')
  if (has('notes')) patch.notes = coerceNotes(body.notes)
  if (has('stemsAvailable')) patch.stemsAvailable = coerceStemsAvailable(body.stemsAvailable)

  const now = new Date()
  patch.updatedAt = now // bump on EVERY edit, incl. availability-only

  const updated = await db.update(flower).set(patch).where(eq(flower.id, id)).returning().get()

  // Replace the photo set only when explicitly provided.
  let photoKeys: string[]
  if (has('photoKeys')) {
    const keys = coercePhotoKeys(body.photoKeys)
    await db.delete(flowerPhoto).where(eq(flowerPhoto.flowerId, id))
    if (keys.length) {
      await db.insert(flowerPhoto).values(
        keys.map((r2Key, i) => ({
          id: crypto.randomUUID(),
          flowerId: id,
          r2Key,
          sortOrder: i,
          createdAt: now
        }))
      )
    }
    photoKeys = keys
  } else {
    photoKeys = await loadPhotoKeys(db, id)
  }

  return toFlowerDto(updated, photoKeys)
})
