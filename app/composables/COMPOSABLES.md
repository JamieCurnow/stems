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

Consent Mode v2, backed by a first-party cookie (`stems_consent`) so SSR/edge code can read it on the first request. Every change re-pushes `gtag('consent', 'update', …)`. Bump `CONSENT_VERSION` (in the composable) when categories change — old cookies invalidate and the banner re-shows.

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

## `useAnalytics`

Typed wrapper around `dataLayer.push` — the single choke-point for client-side analytics. Server-side and pre-GTM calls safely no-op (GTM's stub flushes the queue once it boots).

### Usage

```ts
const { track, setUserId, setUserProperties } = useAnalytics()
track('cta_click', { cta_location: 'hero', cta_label: 'Start trial' })
```

### Returns

- `track(name, params?)` — push a custom event.
- `setUserId(id | null)` — push a `set_user_id` event.
- `setUserProperties(props)` — push a `set_user_properties` event.

---

## `useAnalyticsIdentity`

Client-only. Watches the auth session + `useState('billing-status')` and pushes `set_user_id` / `set_user_properties` to the dataLayer when either changes. Call once from `app.vue`:

```ts
if (import.meta.client) await useAnalyticsIdentity()
```

Typed `async` so future trait-enrichment fetches won't be a breaking change, though it's synchronous underneath.

---

## Learnings

- **State is shared via `useState`, not Pinia.** `useProfile` (`'profile'`) and `useSubscription` (`'billing-status'`) own the two cross-component state keys. `<AppTabBar>` and `useAnalyticsIdentity` read those same keys directly — keep the key strings in sync. Pinia is installed but no stores exist (see `app/stores/STORES.md`).
- **Auth is client-resolved.** `authClient.useSession()` (no `useFetch`) returns a reactive ref but only resolves on the client, so SSR/first paint look "logged out". Gate logged-out-only UI on `session.isPending` to avoid a flash for already-signed-in users; pass `useFetch` (as `useAuth` does) when you need the value hydrated during SSR.
- **Prefer `useRequestFetch()` over `useFetch` for auth-dependent reads in middleware/composables.** `useFetch` dedupes by URL and would serve the stale "logged out" response cached during the original render after client-side sign-in. `useRequestFetch()` returns the event-bound `$fetch` on SSR (forwarding cookies + the Cloudflare platform context so D1 bindings resolve) and plain `$fetch` on the client.
