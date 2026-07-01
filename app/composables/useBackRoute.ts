/**
 * Resolve a "back" destination for a page that can be reached from more than one
 * place (e.g. an edit page opened from the owner's dashboard OR from the public
 * page). Entry points pass where to return via a `?backRoute=` query param; this
 * reads it, validates it's a safe in-app path, and falls back to `fallback`.
 *
 * Only same-origin absolute paths are honoured ('/foo'), never protocol-relative
 * ('//evil.com') or external URLs — so the value can't be used to bounce a user
 * off-site.
 */
export function useBackRoute(fallback: string) {
  const route = useRoute()
  return computed(() => {
    const raw = route.query.backRoute
    const value = Array.isArray(raw) ? raw[0] : raw
    if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
      return value
    }
    return fallback
  })
}
