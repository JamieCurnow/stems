import type { ProfileRow } from '~~/server/db/schema'

/**
 * Shared source of truth for the signed-in user's profile.
 *
 * Backed by `useState('profile')` — the SAME key the app tab bar reads for its
 * `isGrower` flag — so onboarding and edits light up the shell without a reload.
 * `null` means "signed in but not yet onboarded"; `undefined` means "not yet
 * fetched" (lets the onboarding middleware know it needs to load).
 */
export function useProfile() {
  const profile = useState<ProfileRow | null | undefined>('profile', () => undefined)

  // Fetch once per session and cache. Forwards cookies on SSR via useRequestFetch.
  async function refresh() {
    profile.value = await useRequestFetch()<ProfileRow | null>('/api/profile/me')
    return profile.value
  }

  // Ensure we have a value (fetches only if we've never loaded it).
  async function ensure() {
    if (profile.value === undefined) await refresh()
    return profile.value
  }

  // Replace the cached profile after onboarding/edit so the shell updates live.
  function set(next: ProfileRow | null) {
    profile.value = next
  }

  return { profile, refresh, ensure, set }
}
