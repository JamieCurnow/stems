import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { getSafeRouterParam, readZodBody } from '~~/server/utils/validation'
import { flower, flowerPhoto, type FlowerRow } from '~~/server/db/schema'
import { flowerPatchSchema, loadPhotoKeys, toFlowerDto } from './index.post'
import type { FlowerDto } from '~~/shared/types/flower'

/**
 * PATCH /api/flowers/[id] — partial update. Only the keys present in the body
 * are touched (`flowerPatchSchema` is `.partial()`, so absent keys never appear
 * in the parsed result), so this cheaply handles the high-frequency
 * stems-available quick update from the list. `updatedAt` ALWAYS bumps (it
 * drives the public "Updated X ago" line). If `photoKeys` is present, the photo
 * set is replaced.
 */
export default defineEventHandler(async (event): Promise<FlowerDto> => {
  const user = await requireUser(event)
  const db = useDb(event)

  const id = getSafeRouterParam(event, 'id')

  const existing = await db.select().from(flower).where(eq(flower.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Flower not found' })
  if (existing.growerId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Not your flower' })
  }

  // `.partial()` keeps only the keys actually sent — including those set to null.
  const { photoKeys, ...fields } = await readZodBody(event, flowerPatchSchema)

  const now = new Date()
  // Bump on EVERY edit, incl. availability-only.
  const patch: Partial<FlowerRow> = { ...fields, updatedAt: now }

  const updated = await db.update(flower).set(patch).where(eq(flower.id, id)).returning().get()

  // Replace the photo set only when explicitly provided.
  let resolvedKeys: string[]
  if (photoKeys !== undefined) {
    await db.delete(flowerPhoto).where(eq(flowerPhoto.flowerId, id))
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
    resolvedKeys = photoKeys
  } else {
    resolvedKeys = await loadPhotoKeys(db, id)
  }

  return toFlowerDto(updated, resolvedKeys)
})
