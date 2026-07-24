import { authClient } from '~/utils/auth-client'

/**
 * Keep GA4's `user_id` + `user_properties` in sync with the current Better
 * Auth session and profile, and mirror the same identity into PostHog.
 *
 * `user_id` lets GA4 stitch a person's sessions across devices; the
 * `is_grower` user property is Stems' core segmentation axis (seller vs
 * buyer). Reset on sign-out so a shared browser doesn't bleed identities.
 *
 * Called once from `app.vue` (client-only, with top-level await). Reads the
 * shared `useProfile()` state rather than fetching, so it never triggers its
 * own request — it just reacts to whatever the profile plugin has loaded.
 */
export async function useAnalyticsIdentity() {
  const { setUserId, setUserProperties } = useAnalytics()
  const posthog = usePostHog()

  const { data: session } = await authClient.useSession(useFetch)
  const { profile } = useProfile()

  // user_id ↔ session
  watch(
    () => session.value?.user?.id ?? null,
    (id, prevId) => {
      setUserId(id)
      if (id) {
        posthog?.identify(id, {
          email: session.value?.user?.email,
          name: session.value?.user?.name
        })
      } else if (prevId) {
        posthog?.reset()
      }
    },
    { immediate: true }
  )

  // user_properties ↔ profile (grower vs buyer, signup cohort)
  watch(
    () => profile.value,
    (p) => {
      if (!p) return
      const props: Record<string, string | boolean> = { is_grower: !!p.isGrower }
      const created = p.createdAt ? new Date(p.createdAt as unknown as string | number) : null
      if (created && !Number.isNaN(created.getTime())) {
        props.signup_month = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`
      }
      setUserProperties(props)
      posthog?.setPersonProperties(props)
    },
    { immediate: true }
  )
}
