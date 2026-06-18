import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'
import * as schema from '../db/schema'

export type Db = DrizzleD1Database<typeof schema>

/**
 * Build a Drizzle client bound to the request-scoped D1 binding.
 *
 * Cloudflare bindings don't exist at module load time, so we can't construct
 * this once and re-use it like in a Node app. Call `useDb(event)` inside
 * every handler that needs database access.
 */
export const useDb = (event: H3Event): Db => {
  const env = event.context.cloudflare?.env
  if (!env?.DB) {
    throw createError({
      statusCode: 500,
      statusMessage: 'D1 binding DB not found on event.context.cloudflare.env'
    })
  }
  return drizzle(env.DB, { schema })
}
