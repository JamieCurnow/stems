// Guard pages with `definePageMeta({ middleware: 'auth' })`.
// Sends unauthenticated visitors to /login and remembers where they came
// from via a `redirect` query param.
//
// Uses useRequestFetch (event-bound on SSR, $fetch on client) rather than
// authClient.useSession(useFetch): useFetch dedupes by URL, so after the
// user signs in client-side we'd otherwise read the stale "logged out"
// response cached during the original render and bounce them back here.
type Session = { user?: { id: string } } | null

export default defineNuxtRouteMiddleware(async (to) => {
  const session = await useRequestFetch()<Session>('/api/auth/get-session')

  if (!session?.user) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
