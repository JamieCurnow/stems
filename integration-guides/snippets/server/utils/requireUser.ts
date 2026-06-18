import type { H3Event } from 'h3'
import { serverAuth } from './auth'

/**
 * Resolve the current user from the Better Auth session cookie. Throws 401
 * if there's no valid session — call this at the top of every endpoint
 * that should be authenticated.
 */
export const requireUser = async (event: H3Event) => {
  const auth = serverAuth(event)
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })
  }
  return session.user
}
