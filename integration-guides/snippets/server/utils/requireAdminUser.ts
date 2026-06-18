import type { H3Event } from 'h3'
import { serverAuth } from './auth'

/**
 * Session-or-secret gate for admin endpoints the UI calls AND scripts hit.
 * Returns AdminContext so handlers know which path got in (useful for audit
 * logging). Allow-list of admin emails — no role column on user.
 *
 * For machine-only endpoints (cron drainers, internal pokes) use requireAdmin
 * (secret-only). The two coexist — secret for machines, session for humans.
 */

const DEFAULT_ADMIN_EMAILS = ['jamie@island-web.ca']

function adminEmails(event: H3Event): string[] {
  const env = event.context.cloudflare?.env
  const extra = (env?.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
  return [...DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...extra]
}

export interface AdminContext {
  user: { id: string; email: string; name?: string } | null
  via: 'session' | 'secret'
}

export const requireAdminUser = async (event: H3Event): Promise<AdminContext> => {
  const env = event.context.cloudflare?.env

  // 1. Machine path
  const secret = env?.ADMIN_API_SECRET
  const provided = getHeader(event, 'x-admin-secret') || (getQuery(event).secret as string | undefined)
  if (secret && provided && provided === secret) {
    return { user: null, via: 'secret' }
  }

  // 2. Session path — must be on the allow-list
  const session = await serverAuth(event).api.getSession({ headers: event.headers })
  if (!session?.user?.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })
  }
  if (!adminEmails(event).includes(session.user.email.toLowerCase())) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return {
    user: { id: session.user.id, email: session.user.email, name: session.user.name ?? undefined },
    via: 'session'
  }
}
