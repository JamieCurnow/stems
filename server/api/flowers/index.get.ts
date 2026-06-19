import { and, asc, desc, eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { imgUrl } from '~~/server/utils/img'
import { flower, flowerPhoto } from '~~/server/db/schema'
import { bunchPrice } from '~~/shared/utils/price'
import type { FlowerDto } from '~~/shared/types/flower'

/**
 * GET /api/flowers — the signed-in grower's flowers.
 *
 * Non-archived by default; `?archived=1` includes archived rows. One query with
 * a leftJoin onto flower_photo (no N+1), grouped in JS. Photo URLs resolved via
 * imgUrl() so the client never sees raw R2 keys; primary photo (lowest
 * sortOrder) comes first. Order: sortOrder asc, then updatedAt desc as a
 * tiebreaker.
 */
export default defineEventHandler(async (event): Promise<FlowerDto[]> => {
  const user = await requireUser(event)
  const db = useDb(event)

  const includeArchived = getQuery(event).archived === '1'

  const where = includeArchived
    ? eq(flower.growerId, user.id)
    : and(eq(flower.growerId, user.id), eq(flower.isArchived, false))

  const rows = await db
    .select({
      id: flower.id,
      name: flower.name,
      variety: flower.variety,
      color: flower.color,
      stemLengthCm: flower.stemLengthCm,
      stemsPerBunch: flower.stemsPerBunch,
      pricePerStem: flower.pricePerStem,
      pricePerBunch: flower.pricePerBunch,
      openToOffers: flower.openToOffers,
      availabilityStatus: flower.availabilityStatus,
      stemsAvailable: flower.stemsAvailable,
      notes: flower.notes,
      sortOrder: flower.sortOrder,
      updatedAt: flower.updatedAt,
      photoKey: flowerPhoto.r2Key,
      photoSort: flowerPhoto.sortOrder
    })
    .from(flower)
    .leftJoin(flowerPhoto, eq(flowerPhoto.flowerId, flower.id))
    .where(where)
    .orderBy(asc(flower.sortOrder), desc(flower.updatedAt), asc(flowerPhoto.sortOrder))
    .all()

  // Group the joined rows into one DTO per flower, collecting photo keys in
  // photo-sortOrder order (already sorted by the query's orderBy).
  const byId = new Map<string, FlowerDto>()
  for (const r of rows) {
    let dto = byId.get(r.id)
    if (!dto) {
      dto = {
        id: r.id,
        name: r.name,
        variety: r.variety,
        color: r.color,
        stemLengthCm: r.stemLengthCm,
        stemsPerBunch: r.stemsPerBunch,
        pricePerStem: r.pricePerStem,
        pricePerBunch: bunchPrice(r),
        openToOffers: r.openToOffers,
        availabilityStatus: r.availabilityStatus as FlowerDto['availabilityStatus'],
        stemsAvailable: r.stemsAvailable,
        notes: r.notes,
        sortOrder: r.sortOrder,
        photoUrls: [],
        updatedAt: r.updatedAt.getTime()
      }
      byId.set(r.id, dto)
    }
    if (r.photoKey) {
      const url = imgUrl(r.photoKey)
      if (url) dto.photoUrls.push(url)
    }
  }

  return [...byId.values()]
})
