import type { H3Event } from 'h3'
import type { z } from 'zod'

/**
 * Zod request-validation helpers. The single, app-wide way to validate input —
 * prefer these over hand-rolled coercion. Each throws a 400 with a readable
 * message (the first failing issue, prefixed with its field path) so the
 * frontend can surface it directly. The returned value is fully typed from the
 * schema, so handlers get inference for free.
 *
 *   const body = await readZodBody(event, z.object({ name: z.string() }))
 *   const { q } = getZodQuery(event, z.object({ q: z.string().optional() }))
 *   const id = getSafeRouterParam(event, 'id')
 */

/** Format the first Zod issue as "path: message" (or just "message" at the root). */
const firstIssue = (error: z.ZodError): string => {
  const issue = error.issues[0]
  if (!issue) return 'Invalid input'
  const path = issue.path.join('.')
  return path ? `${path}: ${issue.message}` : issue.message
}

/** Validate the JSON request body against `schema`. Throws 400 on failure. */
export async function readZodBody<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.infer<T>> {
  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: firstIssue(result.error) })
  }
  return result.data
}

/** Validate the query string against `schema`. Throws 400 on failure. */
export function getZodQuery<T extends z.ZodType>(event: H3Event, schema: T): z.infer<T> {
  const query = getQuery(event)
  const result = schema.safeParse(query)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: firstIssue(result.error) })
  }
  return result.data
}

/** Read a required router param, throwing 400 if it's missing/empty. */
export function getSafeRouterParam(event: H3Event, name: string): string {
  const value = getRouterParam(event, name)
  if (!value) throw createError({ statusCode: 400, statusMessage: `Missing ${name}` })
  return value
}
