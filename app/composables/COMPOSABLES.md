# Composables

Documentation for the composables used throughout the application. All are auto-imported (no `import` needed in components/pages).

---

## `useAuth`

Thin wrapper over the Better Auth Vue client (`~/utils/auth-client`). Exposes the reactive session plus sign-in/out actions.

### Usage

```ts
const { session, signIn, signOut } = useAuth()
const signedIn = computed(() => !!session.value.data?.user)
```

### Returns

- `session` — reactive session ref from `authClient.useSession(useFetch)` (hydrated during SSR so the server-rendered HTML reflects auth state; pass `useFetch` so cookies are forwarded).
- `signIn` / `signOut` — the Better Auth client actions (e.g. `signIn.magicLink({ email, callbackURL })`).

---

## `useProfile`

Shared source of truth for the signed-in user's profile. Backed by `useState('profile')` — the **same key** `<AppTabBar>` reads for its `isGrower` flag — so onboarding and edits light up the shell without a reload.

### Usage

```ts
const { profile, refresh, ensure, set } = useProfile()
await ensure() // fetch once if never loaded
set(updatedRow) // replace cache after onboarding/edit
```

### Returns

- `profile`: `Ref<ProfileRow | null | undefined>` — `undefined` = never fetched, `null` = signed in but not onboarded, otherwise the row.
- `refresh()` — re-fetch `/api/profile/me` (forwards cookies on SSR via `useRequestFetch`).
- `ensure()` — fetch only if `profile` is still `undefined`.
- `set(next)` — overwrite the cached profile (call after a successful POST/PATCH so the shell updates live).

---

## `useSubscription`

Reactive billing state + actions. Wraps `/api/billing/me` for status and the Better Auth Stripe client plugin for Checkout/portal.

### Usage

```ts
const { status, loading, refresh, startCheckout, openPortal } = useSubscription()
await refresh()
await startCheckout({ successPath: '/billing/success' })
```

### Returns

- `status`: `Ref<BillingStatus | null>` — `useState('billing-status')`. Date fields (`periodEnd`, `trialEnd`, `cancelAt`) are ISO strings over JSON.
- `loading`: `Ref<boolean>`
- `refresh()` — re-fetch `/api/billing/me` (cookie-forwarding `useRequestFetch`).
- `startCheckout(opts?)` — `authClient.subscription.upgrade(...)` then redirect to the returned Checkout URL. Throws if no URL comes back.
- `openPortal()` — `POST /api/billing/portal` then redirect to the Stripe Customer Portal.

---

## `useConsent`

Cookie-backed cookie-consent choice, stored in a first-party cookie (`stems_consent`) so SSR/edge code can read it on the first request. **Dormant** — no analytics or marketing tags are wired up yet (Google Analytics was removed), so this just records the user's preference; nothing reads it. When a provider is added (e.g. PostHog), have it consult `state.value.analytics` on boot and react to `set()`. Bump `CONSENT_VERSION` (in the composable) when categories change — old cookies invalidate and the banner re-shows.

### Usage

```ts
const consent = useConsent()
if (!consent.decided.value) {
  /* show banner */
}
consent.acceptAll()
consent.set({ analytics: true, marketing: false })
```

### Returns

- `decided`: `ComputedRef<boolean>` — has the user made a current-version choice?
- `state`: `ComputedRef<ConsentChoice>` — `{ analytics, marketing, version, decidedAt }` (denied defaults until decided).
- `set(input)` / `acceptAll()` / `rejectAll()` / `reset()`.

---

## `useBackRoute`

Resolves the "back" destination for a page reachable from more than one place (e.g. an edit page opened from the owner's dashboard **or** from the public page). Entry points pass where to return via a `?backRoute=` query param; this reads it, validates it's a safe in-app absolute path, and falls back to the given default. Used by `/account/edit` (default `/account`) and `/flowers/[id]/edit` (default `/flowers`).

### Usage

```ts
const backRoute = useBackRoute('/flowers') // ComputedRef<string>
// entry point (link or navigateTo):
navigateTo({ path: `/flowers/${id}/edit`, query: { backRoute: '/flowers' } })
```

### Returns

- `ComputedRef<string>` — the validated `backRoute` query value, or the fallback. Only same-origin absolute paths (`/foo`) are honoured; protocol-relative (`//evil.com`) and external URLs are rejected, so it can't be used to bounce a user off-site.

---

## Learnings

- **State is shared via `useState`, not Pinia.** `useProfile` (`'profile'`) and `useSubscription` (`'billing-status'`) own the two cross-component state keys. `<AppTabBar>` reads those same keys directly — keep the key strings in sync. Pinia is installed but no stores exist (see `app/stores/STORES.md`).
- **One owner per `useState` default — never seed `'profile'` elsewhere.** `useProfile` defaults `'profile'` to `undefined` (= "not fetched"); `ensure()` only fetches when it's `undefined`. A consumer that seeds its own default (e.g. `<AppTabBar>` once did `useState('profile', () => null)`) wins the race on public pages like `/discover` (the PWA `start_url`, no onboarding middleware) and wedges the state at `null` — so `ensure()` never fetches: grower tabs vanish and Profile bounces to `/onboarding`. Consumers must read `const { profile } = useProfile()`, not re-declare the state.
- **`profile.client.ts` loads the profile from the session.** Public app-layout pages don't run the onboarding middleware, so nothing would load the profile there. The client plugin watches `authClient.useSession()` and fetches `/api/profile/me` (keyed by user id) whenever a session is present — lighting up the grower shell on every page and recovering from a stale/SSR-missing profile. It clears the state only on a confirmed sign-out (not while the session is still resolving), so an SSR-hydrated profile doesn't flash off.
- **Auth is client-resolved.** `authClient.useSession()` (no `useFetch`) returns a reactive ref but only resolves on the client, so SSR/first paint look "logged out". Gate logged-out-only UI on `session.isPending` to avoid a flash for already-signed-in users; pass `useFetch` (as `useAuth` does) when you need the value hydrated during SSR.
- **Prefer `useRequestFetch()` over `useFetch` for auth-dependent reads in middleware/composables.** `useFetch` dedupes by URL and would serve the stale "logged out" response cached during the original render after client-side sign-in. `useRequestFetch()` returns the event-bound `$fetch` on SSR (forwarding cookies + the Cloudflare platform context so D1 bindings resolve) and plain `$fetch` on the client.
