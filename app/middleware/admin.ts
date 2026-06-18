// Guard admin pages with `definePageMeta({ middleware: ['auth', 'admin'] })`.
// Server is the source of truth — this middleware just asks /api/admin/me
// (backed by requireAdminUser) and bounces non-admins to /login.
//
// Deliberately re-fetches on every navigation (no client-side cache). Admin
// status is rare and the round-trip is cheap — being correct > being fast.
export default defineNuxtRouteMiddleware(async (to) => {
  try {
    await useRequestFetch()('/api/admin/me')
  } catch {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
