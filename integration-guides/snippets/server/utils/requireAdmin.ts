import type { H3Event } from 'h3'

/**
 * Header-based gate for internal/admin/cron endpoints. Looks for
 * `X-Admin-Secret` (or `?secret=` query param) matching the env-configured
 * `ADMIN_API_SECRET`.
 *
 * For an admin UI gated by session, see requireAdminUser.ts (allow-list of
 * admin emails). The two paths coexist — secret for machines, session for
 * humans.
 */
export const requireAdmin = (event: H3Event) => {
  const env = event.context.cloudflare?.env
  const expected = env?.ADMIN_API_SECRET
  if (!expected) {
    throw createError({ statusCode: 500, statusMessage: 'ADMIN_API_SECRET is not configured' })
  }
  const provided = getHeader(event, 'x-admin-secret') || getQuery(event).secret
  if (provided !== expected) {
    throw createError({ statusCode: 401, statusMessage: 'Forbidden' })
  }
}
