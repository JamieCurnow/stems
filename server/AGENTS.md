# Server

This directory contains the server-side code for the application.
Utils that are specifically server-side are in server/utils.

API endpoints are in server/api.
The api endpoints follow routing similar to nuxt pages where the directory structure determines the route.
For example, server/api/plant/index.get.ts is the handler for GET /api/plant.
server/api/plant/[uid].get.ts is the handler for GET /api/plant/:uid.
server/api/plant/[uid].put.ts is the handler for PUT /api/plant/:uid.

You should always define the method as a suffix to the file name, e.g. index.get.ts, index.post.ts, etc.

API endpoints are defined with a default export of defineEventHandler().
`export default defineEventHandler(async (event) => {})`

This is an H3 handler under the hood.

There is a SERVER_ENDPOINTS.md file in this directory that documents all of the endpoints in this directory.

- If you add a new endpoint, it must be documented in SERVER_ENDPOINTS.md.
- If you remove an endpoint, it must be removed from SERVER_ENDPOINTS.md.
- If you update an endpoint, it must be updated in SERVER_ENDPOINTS.md.
- If you learn something worth preserving, add it to the `## Learnings` section in SERVER_ENDPOINTS.md.

## Cloudflare runtime

This is a **Cloudflare Workers** app. Bindings and secrets are request-scoped — they live on `event.context.cloudflare.env` and don't exist at module load. So DB/auth/Stripe/Resend clients are built **per request** via `use*(event)` factories (`useDb`, `serverAuth`, `useStripe`, `useResend`). Never reach for `process.env` — it's empty here.

## Auth

Auth should be the first thing in the handler. Auth is **Better Auth** with a session cookie (no bearer tokens):

- `requireUser(event)` — resolves the user from the session cookie, throws **401** if signed out.
  ```ts
  const user = await requireUser(event)
  ```
- `requireActiveSubscription(event)` — `requireUser` + verifies an active/trialing subscription, throws **402** if unsubscribed. Returns `{ user, subscription }`.
- `requireAdmin(event)` — header/secret gate (`X-Admin-Secret`) for machine endpoints (cron, internal).
- `requireAdminUser(event)` — session allow-list **or** secret, for admin endpoints hit by both the UI and scripts.

See `server/utils/SERVER_UTILS.md`. (There is no `useServerAuth`/`useServerAuthWithError` — that was a Firebase-stack convention and does not exist here.)

## Validation

Validate with the Zod helpers in `server/utils/validation.ts` — not hand-rolled coercion.

```ts
const bodySchema = z.object({ name: z.string(), age: z.number() })
const { name, age } = await readZodBody(event, bodySchema) // throws 400 on invalid
```

- `readZodBody(event, schema)` — validate the JSON body.
- `getZodQuery(event, schema)` — validate the query string.
- `getSafeRouterParam(event, name)` — required router param, throws 400 if missing.

For PATCH endpoints, make the schema `.partial()` so only the keys present in the body are touched (an explicit `null` still clears a column). Shared domain schemas live with their domain (e.g. `flowerCreateSchema`/`flowerPatchSchema` in `flowers/index.post.ts`, `profileCreateSchema`/`profilePatchSchema` in `server/utils/profileSchemas.ts`).

## Errors

Throw H3's auto-imported `createError`:

```ts
throw createError({ statusCode: 404, statusMessage: 'Flower not found' })
```

`statusMessage` is surfaced to the client (the frontend reads `e.statusMessage`), so phrase it for humans. There is no `serverError()` helper here. You don't need to wrap a handler in try/catch — any unhandled throw becomes a 500.
