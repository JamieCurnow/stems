/**
 * Typed wrapper around `dataLayer.push` (GTM).
 *
 * One choke-point so we can swap providers later without touching every
 * call site. Calls are no-ops on the server and before GTM has booted
 * (GTM's stub queues `dataLayer` pushes until the script loads). GA4 tags
 * fire from the container off these pushes — see roadmap/analytics/.
 */

type Primitive = string | number | boolean | null | undefined
type Param = Primitive | Primitive[] | Record<string, Primitive> | Array<Record<string, Primitive>>
type Params = Record<string, Param>

interface DataLayerWindow extends Window {
  dataLayer?: Array<Record<string, unknown>>
}

export function useAnalytics() {
  function pushDataLayer(payload: Record<string, unknown>) {
    if (!import.meta.client) return
    const w = window as DataLayerWindow
    w.dataLayer = w.dataLayer ?? []
    w.dataLayer.push(payload)
  }

  function track(eventName: string, params: Params = {}) {
    pushDataLayer({ event: eventName, ...params })
  }

  function setUserId(userId: string | null) {
    if (!import.meta.client) return
    pushDataLayer({ event: 'set_user_id', user_id: userId })
  }

  function setUserProperties(props: Record<string, Primitive>) {
    if (!import.meta.client) return
    pushDataLayer({ event: 'set_user_properties', user_properties: props })
  }

  return { track, setUserId, setUserProperties }
}
