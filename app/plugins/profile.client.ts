import { authClient } from '~/utils/auth-client'

/**
 * Keep the shared `profile` state in sync with the session, on the client.
 *
 * Why this exists: the session resolves client-side (cookie), and the app's
 * main entry — /discover, the PWA start_url — is a PUBLIC page that doesn't run
 * the onboarding middleware that would otherwise load the profile. Without this,
 * a signed-in grower lands with no profile loaded: no My Flowers / Add tabs, and
 * tapping Profile bounces to /onboarding (the onboarding gate reads the same
 * `useState('profile')`). Fetching here, keyed off the session user id, lights
 * the shell up on every page and recovers from any stale or SSR-missing profile.
 *
 * `undefined` = not yet fetched, `null` = fetched but no profile (not onboarded),
 * a row = the profile. We only fetch when we don't already hold this user's row.
 */
export default defineNuxtPlugin(() => {
  const { profile, refresh } = useProfile()
  const session = authClient.useSession()

  // The user id whose profile we've loaded; lets us skip redundant fetches and
  // only clear on a real sign-out (not while the session is still resolving).
  let loadedFor: string | null = null

  watch(
    session,
    async (s) => {
      // Session still resolving — don't touch the state (would wipe an
      // SSR-hydrated profile and flash the grower tabs off).
      if (s.isPending) return

      const userId = s.data?.user?.id ?? null

      if (!userId) {
        // Confirmed signed out: forget the cached profile so a later sign-in
        // re-fetches. Guarded so the initial "no session yet" tick is a no-op.
        if (loadedFor) {
          loadedFor = null
          profile.value = undefined
        }
        return
      }

      if (userId === loadedFor) return
      // Already have this user's row (e.g. hydrated from SSR)? Adopt it.
      if (profile.value?.userId === userId) {
        loadedFor = userId
        return
      }

      loadedFor = userId
      try {
        await refresh()
      } catch {
        // Transient (e.g. cookie just expired): leave the state as-is and let
        // the onboarding middleware's ensure() retry on the next navigation.
        loadedFor = null
      }
    },
    { immediate: true, deep: true }
  )
})
