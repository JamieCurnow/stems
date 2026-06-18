import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { getSafeRouterParam } from '~~/server/utils/validation'
import { flower } from '~~/server/db/schema'

/**
 * DELETE /api/flowers/[id] — soft-delete (set isArchived = true). Keeps the row
 * and its photos; hard delete is V2. Bumps updatedAt. 403 on others' flowers.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)

  const id = getSafeRouterParam(event, 'id')

  const existing = await db.select({ growerId: flower.growerId }).from(flower).where(eq(flower.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Flower not found' })
  if (existing.growerId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Not your flower' })
  }

  await db.update(flower).set({ isArchived: true, updatedAt: new Date() }).where(eq(flower.id, id))

  return { ok: true }
})
