// Gates the signed-in app on having completed onboarding.
//
// Apply AFTER `auth` (which guarantees a session): pages opt in with
//   definePageMeta({ middleware: ['auth', 'onboarding'] })
// The /onboarding page itself uses only this middleware (it's reachable by any
// signed-in user) — it must NOT list `auth`/`onboarding` in a way that loops.
//
// Behaviour:
//   - signed in, no profile, not on /onboarding  → /onboarding
//   - on /onboarding with a profile already       → /discover
export default defineNuxtRouteMiddleware(async (to) => {
  const session = await useRequestFetch()<{ user?: { id: string } } | null>('/api/auth/get-session')
  if (!session?.user) return // not signed in: `auth` middleware handles redirects

  const { profile, ensure } = useProfile()
  await ensure()

  const onboarded = profile.value != null

  if (!onboarded && to.path !== '/onboarding') {
    return navigateTo('/onboarding')
  }

  if (onboarded && to.path === '/onboarding') {
    return navigateTo('/discover')
  }
})
