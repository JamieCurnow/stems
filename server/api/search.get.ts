import { and, desc, eq, max, sql } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '~~/server/utils/db'
import { getZodQuery } from '~~/server/utils/validation'
import { imgUrl } from '~~/server/utils/img'
import { flower, profile } from '~~/server/db/schema'

/**
 * Grower search/discovery result. Returned by GET /api/search and consumed by
 * the /discover page + <GrowerCard>. Avatar is a resolved /img URL (never a raw
 * R2 key); counts/timestamps come from a grouped join (no N+1).
 */
export interface GrowerCardDto {
  handle: string
  farmName: string
  locationName: string | null
  avatarUrl: string | null
  flowerCount: number
  lastActiveAt: number // epoch ms — latest of profile/flower activity
}

/**
 * GET /api/search?q=&limit=&cursor= — PUBLIC grower discovery.
 *
 * No auth: this powers a logged-out-reachable /discover page. With an empty `q`
 * it returns a browse list of recently-active growers; with a term it does a
 * case-insensitive substring match across handle / farmName / locationName.
 *
 * Counts + last-active come from a single LEFT JOIN onto `flower` (non-archived)
 * with GROUP BY profile.userId — one query, no N+1. We aggregate flowerCount and
 * the latest flower updatedAt in SQL.
 *
 * Ranking (term searches): handle exact > handle prefix > farmName match >
 * location match, then most-recently-active. Done with a CASE rank in SQL so it
 * survives pagination (offset).
 *
 * Scale note (V2): `LIKE '%term%'` is an infix match and won't use the
 * profile_handle / profile_isGrower indexes, so it's a full scan. Fine at launch
 * scale (tens–hundreds of growers). When growth demands it, add a SQLite FTS5
 * virtual table over handle/farmName/locationName/bio, or a normalised search
 * column, and query that instead. Flagged as a V2 perf item.
 */

// Flip to false to surface non-grower profiles in discovery too.
const SEARCH_GROWERS_ONLY = true

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

/**
 * A query int that never 400s: parse, fall back to `def` if absent/garbage,
 * then clamp into [min, max]. A bad `?limit=` shouldn't break public browse.
 */
const clampedInt = (def: number, min: number, max: number) =>
  z.preprocess((v) => {
    const n = typeof v === 'string' ? Number.parseInt(v, 10) : typeof v === 'number' ? v : NaN
    if (!Number.isFinite(n)) return def
    return Math.min(Math.max(n, min), max)
  }, z.number())

const querySchema = z.object({
  q: z
    .string()
    .optional()
    .default('')
    .transform((s) => s.trim()),
  limit: clampedInt(DEFAULT_LIMIT, 1, MAX_LIMIT),
  cursor: clampedInt(0, 0, Number.MAX_SAFE_INTEGER)
})

export default defineEventHandler(async (event): Promise<GrowerCardDto[]> => {
  const db = useDb(event)

  const { q, limit, cursor: offset } = getZodQuery(event, querySchema)

  // Latest of profile.updatedAt and any non-archived flower.updatedAt, in ms.
  const flowerCount = sql<number>`count(${flower.id})`.as('flowerCount')
  const lastFlowerAt = max(flower.updatedAt).as('lastFlowerAt')

  const filters = SEARCH_GROWERS_ONLY ? [eq(profile.isGrower, true)] : []

  // Case-insensitive: D1's default LIKE is case-insensitive for ASCII, but we
  // lower() both sides so it's robust regardless of collation.
  let rankExpr = sql<number>`0`
  if (q) {
    const lower = q.toLowerCase()
    const term = `%${escapeLike(lower)}%`
    const prefix = `${escapeLike(lower)}%`

    filters.push(
      sql`(
        lower(${profile.handle}) LIKE ${term} ESCAPE '\\'
        OR lower(${profile.farmName}) LIKE ${term} ESCAPE '\\'
        OR (${profile.locationName} IS NOT NULL AND lower(${profile.locationName}) LIKE ${term} ESCAPE '\\')
      )`
    )

    // Lower rank number = better match (we order rank asc).
    rankExpr = sql<number>`
      CASE
        WHEN lower(${profile.handle}) = ${lower} THEN 0
        WHEN lower(${profile.handle}) LIKE ${prefix} ESCAPE '\\' THEN 1
        WHEN lower(${profile.farmName}) LIKE ${term} ESCAPE '\\' THEN 2
        ELSE 3
      END
    `
  }

  const rank = rankExpr.as('rank')

  const rows = await db
    .select({
      handle: profile.handle,
      farmName: profile.farmName,
      locationName: profile.locationName,
      avatarKey: profile.avatarKey,
      profileUpdatedAt: profile.updatedAt,
      flowerCount,
      lastFlowerAt,
      rank
    })
    .from(profile)
    .leftJoin(flower, and(eq(flower.growerId, profile.userId), eq(flower.isArchived, false)))
    .where(filters.length ? and(...filters) : undefined)
    .groupBy(profile.userId)
    // Term search: best rank first, then most recently active. Browse (no term):
    // purely most recently active.
    .orderBy(
      q ? sql`rank asc, max(${flower.updatedAt}) desc, ${profile.updatedAt} desc` : desc(profile.updatedAt)
    )
    .limit(limit)
    .offset(offset)
    .all()

  return rows.map((r) => {
    const profileMs = r.profileUpdatedAt.getTime()
    const flowerMs = r.lastFlowerAt ? r.lastFlowerAt.getTime() : 0
    return {
      handle: r.handle,
      farmName: r.farmName,
      locationName: r.locationName,
      avatarUrl: imgUrl(r.avatarKey),
      flowerCount: Number(r.flowerCount) || 0,
      lastActiveAt: Math.max(profileMs, flowerMs)
    }
  })
})

/** Escape LIKE wildcards in user input so `%`/`_`/`\` are matched literally. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`)
}
