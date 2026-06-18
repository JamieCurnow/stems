import { eq, inArray } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { flower } from '~~/server/db/schema'

/**
 * PATCH /api/flowers/reorder — body `{ ids: string[] }`. Assigns sortOrder by
 * index. Every id must belong to the signed-in grower (403 otherwise).
 * updatedAt is intentionally NOT bumped here: reordering isn't a content edit
 * that should freshen the public "Updated X ago" line.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)

  const body = (await readBody(event)) as { ids?: unknown }
  const ids = body.ids
  if (!Array.isArray(ids) || ids.some((i) => typeof i !== 'string')) {
    throw createError({ statusCode: 400, statusMessage: 'ids must be an array of strings' })
  }
  const list = ids as string[]
  if (!list.length) return { ok: true }

  // Ownership: every supplied id must exist and belong to this grower.
  const rows = await db
    .select({ id: flower.id, growerId: flower.growerId })
    .from(flower)
    .where(inArray(flower.id, list))
    .all()
  if (rows.length !== list.length || rows.some((r) => r.growerId !== user.id)) {
    throw createError({ statusCode: 403, statusMessage: 'Not your flower' })
  }

  // Assign sortOrder by position. D1 has no multi-row CASE helper in Drizzle, so
  // issue one update per id (lists are small — a grower's flower count).
  await Promise.all(list.map((id, i) => db.update(flower).set({ sortOrder: i }).where(eq(flower.id, id))))

  return { ok: true }
})
