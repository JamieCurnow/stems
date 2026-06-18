import { authClient } from '~/utils/auth-client'

/**
 * Reactive session, hydrated from the server during SSR.
 *
 * Pass Nuxt's `useFetch` so cookies are forwarded on the initial render —
 * without it, the server-rendered HTML always shows "logged out" until the
 * client re-fetches.
 */
export function useAuth() {
  const session = authClient.useSession(useFetch)
  return {
    session,
    signIn: authClient.signIn,
    signOut: authClient.signOut
  }
}
