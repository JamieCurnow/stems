import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { flower } from '~~/server/db/schema'
import { loadPhotoKeys, toFlowerDto } from './index.post'
import type { FlowerDto } from '~~/shared/types/flower'

/**
 * GET /api/flowers/[id] — a single flower owned by the signed-in grower.
 * 404 if missing, 403 if it belongs to someone else.
 */
export default defineEventHandler(async (event): Promise<FlowerDto> => {
  const user = await requireUser(event)
  const db = useDb(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing flower id' })

  const row = await db.select().from(flower).where(eq(flower.id, id)).get()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Flower not found' })
  if (row.growerId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Not your flower' })
  }

  const photoKeys = await loadPhotoKeys(db, id)
  return toFlowerDto(row, photoKeys)
})
