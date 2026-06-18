---
trigger: always_on
---

# Data fetching |

This app is server-side rendered and uses **Better Auth** with a **session cookie**. Unlike a client-only auth scheme, the session cookie _is_ available to the server on the initial request, so SSR data fetching works — but you have to forward it.

## Public endpoints

For endpoints that need no auth (`/api/public/*`, `/api/search`), use `useFetch` / `$fetch` normally. SSR-friendly, types inferred from the route:

```ts
const { data } = await useFetch('/api/search', { query: { q: debouncedQ }, default: () => [] })
```

## Auth-dependent reads

For reads that depend on the signed-in user, use `useRequestFetch()` — it returns the event-bound `$fetch` on the server (forwarding cookies **and** the Cloudflare platform context, so D1 bindings resolve on the sub-request) and plain `$fetch` on the client:

```ts
const profile = await useRequestFetch()<ProfileRow | null>('/api/profile/me')
```

**Do not** use `useFetch` for session/auth-gated reads in middleware: `useFetch` dedupes by URL, so after a client-side sign-in you'd read the stale "logged out" response cached during the first render. Prefer the established composables — `useProfile()`, `useSubscription()`, `useAuth()` — which already do this correctly.

## Mutations

Use plain `$fetch` for POST/PATCH/DELETE. Apply changes optimistically where it improves UX (e.g. the inline stock edit on `/flowers`) and revert + toast on failure.

```ts
const saved = await $fetch<FlowerDto>(`/api/flowers/${id}`, { method: 'PATCH', body })
```

Type `$fetch<T>()` with the DTO from `shared/types` when the response type isn't inferred from the route.
