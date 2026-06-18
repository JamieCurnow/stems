---
trigger: always_on
---

# Error handling |

## Front end

On pages, components and composables, use try/catch around mutations and surface failures with a `useToast()` message. Server errors carry a human-readable `statusMessage` (see below) — read it for the toast title, with a fallback.

```ts
const toast = useToast()
try {
  const saved = await $fetch<FlowerDto>(`/api/flowers/${id}`, { method: 'PATCH', body })
} catch (e) {
  const message =
    typeof e === 'object' && e && 'statusMessage' in e && typeof e.statusMessage === 'string'
      ? e.statusMessage
      : 'Something went wrong. Please try again.'
  toast.add({ title: message, color: 'error' })
}
```

For optimistic updates, capture the previous value before the request and revert it in the `catch`.

(There is no `useErrorHandle` composable in this app.)

## Server

Throw H3's auto-imported `createError`:

```ts
if (!row) throw createError({ statusCode: 404, statusMessage: 'Flower not found' })
```

`statusMessage` is returned to the client as the HTTP error message and read by the front end, so write it for humans. There is no `serverError()` helper. You don't need to wrap a handler in try/catch — any unhandled throw becomes a 500.
