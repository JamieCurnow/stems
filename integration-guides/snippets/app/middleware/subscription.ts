/**
 * Guard pages with `definePageMeta({ middleware: 'subscription' })`. Three
 * outcomes:
 *   - signed out         → /login (with redirect query)
 *   - signed in, no sub  → /billing
 *   - signed in, active  → continue
 *
 * useRequestFetch() returns the event-bound $fetch on SSR (cookies +
 * event.context._platform.cloudflare forward to the sub-request, so D1
 * bindings resolve) and falls back to plain $fetch on the client. Using it
 * for the session lookup instead of authClient.useSession(useFetch) avoids
 * reading useFetch's stale per-URL cache after client-side sign-in.
 */
type Session = { user?: { id: string } } | null

export default defineNuxtRouteMiddleware(async (to) => {
  const fetcher = useRequestFetch()
  const session = await fetcher<Session>('/api/auth/get-session')

  if (!session?.user) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (to.path.startsWith('/billing')) return

  try {
    const status = await fetcher<{ isActive: boolean }>('/api/billing/me')
    if (!status.isActive) {
      return navigateTo({ path: '/billing', query: { reason: 'inactive' } })
    }
  } catch {
    return navigateTo({ path: '/billing', query: { reason: 'error' } })
  }
})
