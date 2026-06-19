import { and, asc, desc, eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { imgUrl } from '~~/server/utils/img'
import { flower, flowerPhoto, profile } from '~~/server/db/schema'
import { bunchPrice } from '~~/shared/utils/price'
import { isSoldOut } from '~~/shared/utils/flowers'
import { normaliseHandle } from '~~/shared/utils/handle'
import type { FlowerDto } from '~~/shared/types/flower'
import type { PublicProfileDto } from '~~/shared/types/profile'

/**
 * GET /api/public/[handle] — the PUBLIC grower page payload. No auth: this must
 * work logged-out so link previews and first paint render server-side.
 *
 * Returns { profile, flowers } with no private fields (no postcode, email,
 * lat/lng). R2 keys are resolved to /img URLs. Prices are resolved (pricePerBunch
 * derived from stem × count when not overridden).
 *
 * Flower ordering mirrors doc 07's manager list (sortOrder asc, updatedAt desc)
 * but sold_out flowers are pushed last — they still appear (signals range +
 * "ask me") with the Sold Out badge.
 */
export default defineEventHandler(
  async (event): Promise<{ profile: PublicProfileDto; flowers: FlowerDto[] }> => {
    const handle = normaliseHandle(getRouterParam(event, 'handle') ?? '')
    if (!handle) throw createError({ statusCode: 404, statusMessage: 'Profile not found' })

    const db = useDb(event)

    const profileRow = await db
      .select({
        handle: profile.handle,
        farmName: profile.farmName,
        bio: profile.bio,
        locationName: profile.locationName,
        instagram: profile.instagram,
        website: profile.website,
        whatsapp: profile.whatsapp,
        contactEmail: profile.contactEmail,
        preferredContact: profile.preferredContact,
        avatarKey: profile.avatarKey,
        bannerKey: profile.bannerKey,
        isGrower: profile.isGrower,
        userId: profile.userId
      })
      .from(profile)
      .where(eq(profile.handle, handle))
      .get()

    if (!profileRow) throw createError({ statusCode: 404, statusMessage: 'Profile not found' })

    const profileDto: PublicProfileDto = {
      handle: profileRow.handle,
      farmName: profileRow.farmName,
      bio: profileRow.bio,
      locationName: profileRow.locationName,
      instagram: profileRow.instagram,
      website: profileRow.website,
      whatsapp: profileRow.whatsapp,
      contactEmail: profileRow.contactEmail,
      preferredContact: (profileRow.preferredContact as PublicProfileDto['preferredContact']) ?? null,
      avatarUrl: imgUrl(profileRow.avatarKey),
      bannerUrl: imgUrl(profileRow.bannerKey),
      isGrower: profileRow.isGrower
    }

    let flowers: FlowerDto[] = []

    if (profileRow.isGrower) {
      // One query with a leftJoin onto flower_photo (no N+1), grouped in JS.
      // Same DTO mapping approach as server/api/flowers/index.get.ts (doc 07).
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
        .where(and(eq(flower.growerId, profileRow.userId), eq(flower.isArchived, false)))
        .orderBy(asc(flower.sortOrder), desc(flower.updatedAt), asc(flowerPhoto.sortOrder))
        .all()

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

      // Keep the query's order, then stable-sort sold-out flowers last — they
      // still appear (signals range + "ask me") but below in-stock flowers.
      // Sold-out = explicit 0 count OR the 'sold_out' status (see isSoldOut).
      flowers = [...byId.values()].sort((a, b) => (isSoldOut(a) ? 1 : 0) - (isSoldOut(b) ? 1 : 0))
    }

    // Short edge cache — public + only changes when the grower edits. Correctness
    // (fresh availability) beats caching, so keep it brief.
    setHeader(event, 'Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=60')

    return { profile: profileDto, flowers }
  }
)
