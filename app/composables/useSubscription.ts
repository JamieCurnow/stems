import { authClient } from '~/utils/auth-client'
import { PLAN_SLUG } from '~~/shared/utils/constants'

interface BillingStatus {
  hasSubscription: boolean
  isActive: boolean
  status: string | null
  // Drizzle timestamp_ms columns serialise to ISO strings over JSON.
  periodEnd: string | null
  trialEnd: string | null
  cancelAtPeriodEnd: boolean
  cancelAt: string | null
  pendingCancel: boolean
}

/**
 * Reactive billing helpers. Wraps /api/billing/me for state, and Better
 * Auth's stripe-client plugin for actions (upgrade → Checkout, portal).
 */
export function useSubscription() {
  const status = useState<BillingStatus | null>('billing-status', () => null)
  const loading = ref(false)

  async function refresh() {
    loading.value = true
    try {
      // useRequestFetch() returns the SSR-event-bound $fetch on the server
      // (forwards cookies + event.context._platform.cloudflare so D1
      // bindings resolve on the sub-request), and plain $fetch on the client.
      status.value = await useRequestFetch()<BillingStatus>('/api/billing/me')
    } finally {
      loading.value = false
    }
  }

  async function startCheckout(opts?: { successPath?: string; cancelPath?: string }) {
    const { data, error } = await authClient.subscription.upgrade({
      plan: PLAN_SLUG,
      successUrl: opts?.successPath ?? '/billing/success',
      cancelUrl: opts?.cancelPath ?? '/billing/cancel'
    })
    if (error) throw new Error(error.message ?? 'Checkout failed to start')
    if (data && 'url' in data && typeof data.url === 'string') {
      window.location.href = data.url
      return
    }
    throw new Error('Checkout returned no redirect URL')
  }

  async function openPortal() {
    const { url } = await $fetch<{ url: string }>('/api/billing/portal', { method: 'POST' })
    window.location.href = url
  }

  return { status, loading, refresh, startCheckout, openPortal }
}
