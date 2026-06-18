# Stores

Documentation for the Pinia stores used to manage global state.

## Current state: no Pinia stores

There are **no Pinia stores in this app yet**. `@pinia/nuxt` is installed and registered in `nuxt.config.ts`, so stores _can_ be added here, but global state is currently shared through **composables backed by `useState`** instead:

| State                         | Owner                                                      | `useState` key             |
| ----------------------------- | ---------------------------------------------------------- | -------------------------- |
| Signed-in user's profile      | `useProfile()` (`app/composables/useProfile.ts`)           | `'profile'`                |
| Subscription / billing status | `useSubscription()` (`app/composables/useSubscription.ts`) | `'billing-status'`         |
| Auth session                  | `useAuth()` → Better Auth `authClient.useSession()`        | — (managed by Better Auth) |

`<AppTabBar>` and `useAnalyticsIdentity()` read those same `useState` keys directly, so the key strings must stay in sync across files.

### When to reach for Pinia instead

Add a Pinia store here only when state needs richer structure than a single reactive value — multiple coordinated pieces of state with their own actions/getters that several unrelated pages mutate. For a single shared value hydrated from an endpoint, the `useState` + composable pattern above is the lighter, established choice. If you do add one, follow `.agent/rules/stores.md` (setup style, HMR block, `storeToRefs`) and document it below.

<!-- Example entry once a store exists:

## `useThingsStore`

Manages global state for things shared across multiple pages.

### State

- `things`: `Ref<Thing[]>`
- `loading`: `Ref<boolean>`

### Usage

```ts
const thingsStore = useThingsStore()
const { things, loading } = storeToRefs(thingsStore)
```

-->

## Learnings

- **State here is `useState`, not Pinia (yet).** Don't document Firebase's `useAuthStore` — this app uses Better Auth, not Firebase, and there's no auth store. The session lives in the Better Auth client (`app/utils/auth-client.ts`), surfaced via `useAuth()`.
- **Two cross-component state keys exist:** `'profile'` and `'billing-status'`. Reuse `useProfile()` / `useSubscription()` rather than calling `useState` with those keys directly, so the fetch/cache logic stays in one place.
