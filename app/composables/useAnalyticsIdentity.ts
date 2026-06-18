import { authClient } from '~/utils/auth-client'

/**
 * Watches the auth session + billing-status useState and pushes
 *   set_user_id / set_user_properties
 * to the dataLayer when either changes. GTM has dedicated triggers for
 * those two events.
 *
 * Lives outside the boot-time plugin so Vue reactivity does the work.
 * Call once, client-only, from app.vue:
 *
 *   if (import.meta.client) await useAnalyticsIdentity()
 *
 * The `await` is harmless — the function is sync underneath but typed
 * async so future fetches (e.g. trait enrichment) won't be a breaking
 * change for callers.
 */
type BillingStatus = { status: string | null } | null

export async function useAnalyticsIdentity() {
  if (!import.meta.client) return

  const { setUserId, setUserProperties } = useAnalytics()
  const session = authClient.useSession()
  const billing = useState<BillingStatus>('billing-status', () => null)

  watch(
    () => session.value.data?.user?.id ?? null,
    (id) => setUserId(id),
    { immediate: true }
  )

  watch(
    () => billing.value?.status ?? null,
    (status) => {
      if (status != null) setUserProperties({ subscription_status: status })
    },
    { immediate: true }
  )
}
