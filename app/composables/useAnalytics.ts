/**
 * Typed wrapper around dataLayer.push — the single choke-point for
 * client-side analytics. Call from components / composables:
 *
 *   const { track, setUserId, setUserProperties } = useAnalytics()
 *   track('cta_click', { cta_location: 'hero', cta_label: 'Start trial' })
 *
 * Server-side and pre-GTM calls are safely no-op'd. Once GTM boots, its
 * stub flushes anything queued on dataLayer before gtm.js arrived — no
 * race to manage.
 */
type Primitive = string | number | boolean | null | undefined
export type EventParams = Record<string, Primitive | Primitive[] | Record<string, Primitive>>

function getDataLayer(): unknown[] | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { dataLayer?: unknown[] }
  w.dataLayer = w.dataLayer || []
  return w.dataLayer
}

export function useAnalytics() {
  function track(name: string, params?: EventParams) {
    const dl = getDataLayer()
    if (!dl) return
    dl.push({ event: name, ...params })
  }

  function setUserId(id: string | null) {
    const dl = getDataLayer()
    if (!dl) return
    dl.push({ event: 'set_user_id', user_id: id })
  }

  function setUserProperties(props: Record<string, Primitive>) {
    const dl = getDataLayer()
    if (!dl) return
    dl.push({ event: 'set_user_properties', user_properties: props })
  }

  return { track, setUserId, setUserProperties }
}
