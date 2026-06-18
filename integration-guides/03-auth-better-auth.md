# 03 — Auth: Better Auth + Magic Link

Passwordless sign-in. Sessions persisted in D1. Cookies are signed and sent automatically. No password to share, phish, or reset — zero "I forgot my password" support load.

---

## Why Magic Link only

- One auth method instead of two means half the surface area.
- No password hashes in the DB means a breach of `user` rows yields nothing useful.
- Existing accounts from a password-auth phase keep working — Magic Link keys off the `user.email` column, and dormant `account.password` rows are simply never read.
- Easy to add social providers (GitHub, Google) later — they sit alongside the magic link plugin without conflict.

If you genuinely need password auth, flip `emailAndPassword.enabled = true` in `serverAuth` and the CLI stub. Everything else is unchanged.

---

## Install

```bash
npm i better-auth
npm i -D @better-auth/cli@beta
```

**About the CLI version:** `better-auth@1.6.x` requires `@better-auth/cli@1.5.0-beta.x` because the latest stable CLI ships an older `better-call` peer that's missing exports the new core needs. If `npx better-auth generate` fails with `does not provide an export named 'kAPIErrorHeaderSymbol'`, install the beta. Re-check this when bumping `better-auth` itself.

---

## The two auth configs

There are **two Better Auth instances** in the codebase, and they must stay in sync:

1. **`server/utils/auth.ts`** — the real per-request runtime instance. Reads bindings from `event.context.cloudflare.env`. Builds the auth handler that powers `/api/auth/*`.
2. **`server/utils/auth.cli.ts`** — a CLI-only stub used by `@better-auth/cli generate` to compute the schema. Uses an in-memory `better-sqlite3` so the CLI can statically import it without needing Cloudflare bindings.

**Keep the plugins + `user.additionalFields` blocks in lock-step between the two files.** The CLI uses the stub to figure out what columns to add to the migration; if the stub is stale, your generated SQL is wrong.

---

## `server/utils/auth.ts` (runtime)

```ts
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { magicLink } from 'better-auth/plugins'
import type { H3Event } from 'h3'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import * as schema from '../db/schema'
import { sendEmail } from './email'

export function serverAuth(event: H3Event) {
  const env = event.context.cloudflare?.env
  if (!env?.DB) {
    throw new Error('D1 binding DB not found on event.context.cloudflare.env')
  }

  const db = drizzle(env.DB, { schema })

  const options: BetterAuthOptions = {
    database: env.DB,                       // ← Better Auth ≥1.6 accepts D1 natively
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: false },   // ← Magic Link only

    plugins: [
      magicLink({
        expiresIn: 60 * 15,                 // 15-minute link
        sendMagicLink: async ({ email, url }) => {
          await sendEmail(event, {
            emailId: 'magic-link',
            to: email,
            props: { url }
          })
        }
      })
    ]
  }

  return betterAuth(options)
}

export type ServerAuth = ReturnType<typeof serverAuth>
```

Two things to internalise:

1. **The `magicLink.sendMagicLink` callback closes over `event`.** That's how the email send can reach `event.context.cloudflare.env` for the Resend API key. This per-request closure is the trick that makes the Cloudflare pattern composable with Better Auth's plugin API.

2. **`baseURL` matters.** Better Auth derives the cookie domain and CSRF origin checks from `BETTER_AUTH_URL`. If it's wrong (`http://localhost` in prod, or a subdomain mismatch), sign-in succeeds but the cookie isn't accepted on subsequent requests. Sessions appear to "not stick." When debugging "I just signed in but `useSession` returns null," check this first.

---

## `server/utils/auth.cli.ts` (CLI stub)

```ts
import Database from 'better-sqlite3'
import { betterAuth } from 'better-auth'
import { magicLink } from 'better-auth/plugins'

export const auth = betterAuth({
  database: new Database(':memory:'),
  emailAndPassword: { enabled: false },
  plugins: [
    magicLink({ sendMagicLink: async () => {} })
  ]
})
```

Whatever plugins / `user.additionalFields` you have in `auth.ts`, replicate here. The `sendMagicLink` callback is a no-op — the CLI never sends.

---

## The catch-all handler

`server/api/auth/[...all].ts`:

```ts
export default defineEventHandler((event) => {
  const auth = serverAuth(event)
  return auth.handler(toWebRequest(event))
})
```

That's the entire HTTP surface. Better Auth registers every route it needs under `/api/auth/*`:

- `POST /api/auth/sign-in/magic-link` — request a link
- `GET  /api/auth/magic-link/verify`  — consume a link, mint a session
- `GET  /api/auth/get-session`        — read the current session
- `POST /api/auth/sign-out`           — clear the session
- (when the Stripe plugin is added) `POST /api/auth/stripe/webhook`, `POST /api/auth/subscription/upgrade`, etc.

---

## The Vue client

`app/utils/auth-client.ts`:

```ts
import { createAuthClient } from 'better-auth/vue'
import { magicLinkClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [magicLinkClient()]
  // baseURL defaults to /api/auth/* (same-origin) — set explicitly if you split origins
})

export const { signIn, signOut, useSession } = authClient
```

`app/composables/useAuth.ts`:

```ts
import { authClient } from '~/utils/auth-client'

export function useAuth() {
  // Pass Nuxt's useFetch so cookies are forwarded on the SSR fetch — without it,
  // the server-rendered HTML always shows "logged out" until the client re-fetches.
  const session = authClient.useSession(useFetch)
  return {
    session,
    signIn: authClient.signIn,
    signOut: authClient.signOut
  }
}
```

---

## Route middleware

`app/middleware/auth.ts` — gates pages with `definePageMeta({ middleware: 'auth' })`:

```ts
type Session = { user?: { id: string } } | null

export default defineNuxtRouteMiddleware(async (to) => {
  // Use useRequestFetch (event-bound on SSR, $fetch on client) instead of
  // authClient.useSession(useFetch). useFetch dedupes by URL, so after a
  // client-side sign-in it would otherwise read the stale "logged out"
  // response cached during the original SSR render and bounce the user back.
  const session = await useRequestFetch()<Session>('/api/auth/get-session')

  if (!session?.user) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
```

That dedupe footgun bit us once; the comment exists to stop the next person rediscovering it.

---

## Server-side user resolution

`server/utils/requireUser.ts`:

```ts
import type { H3Event } from 'h3'
import { serverAuth } from './auth'

export const requireUser = async (event: H3Event) => {
  const auth = serverAuth(event)
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })
  }
  return session.user
}
```

Use it at the top of every endpoint that should be authenticated:

```ts
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)
  // ...
})
```

---

## Login page

A minimal Vue page that requests the link. See `snippets/app/pages/login.vue` for the full version with error states. The core call is:

```ts
const { error: err } = await authClient.signIn.magicLink({
  email: email.value,
  callbackURL: '/app',                  // where returning users land
  newUserCallbackURL: '/onboarding',    // where brand-new accounts land
  errorCallbackURL: '/login?error=link' // expired/invalid links bounce here
})
```

Better Auth picks `newUserCallbackURL` vs `callbackURL` automatically based on whether verify created the user. So your "first-time" funnel (onboarding wizard, billing setup, etc.) just goes in `newUserCallbackURL`.

---

## Generating the auth migration

Whenever you change the auth options (enable a plugin, add `user.additionalFields`, switch to org-scoped subscriptions, etc.):

```bash
# 1. Update auth.ts AND auth.cli.ts with the new options.

# 2. Generate the migration
npx better-auth generate \
  --config server/utils/auth.cli.ts \
  --output server/db/migrations/000X_<name>.sql \
  --yes

# 3. The CLI emits the ENTIRE schema. Trim it down to a forward diff
#    (delete CREATE TABLE statements for tables that already exist).

# 4. Apply locally
wrangler d1 migrations apply stems --local

# 5. Apply in prod (on deploy — both deploy workflows run this automatically)
wrangler d1 migrations apply stems --remote --env production
```

---

## Admin access — dual-mode auth

Most apps end up with an admin area that's reachable two ways: through a browser by humans (session-authed), and through scripts / cron / curl (header-secret authed). Better Auth handles the session path; the secret path is a thin extra check.

This stack uses two helpers, depending on what the endpoint serves:

### `requireAdmin` — secret-only

Use this on **machine-only endpoints** (cron drainers, internal poke endpoints, anything no human visits). The bar is "you knew the secret"; no session is consulted.

```ts
// server/utils/requireAdmin.ts
import type { H3Event } from 'h3'

export const requireAdmin = (event: H3Event) => {
  const env = event.context.cloudflare?.env
  const expected = env?.ADMIN_API_SECRET
  if (!expected) {
    throw createError({ statusCode: 500, statusMessage: 'ADMIN_API_SECRET is not configured' })
  }
  const provided = getHeader(event, 'x-admin-secret') || getQuery(event).secret
  if (provided !== expected) {
    throw createError({ statusCode: 401, statusMessage: 'Forbidden' })
  }
}
```

Use it like `requireUser`, at the top of the handler:

```ts
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return runScheduledEmailQueue(event)
})
```

`ADMIN_API_SECRET` is a wrangler secret. Set with `wrangler secret put ADMIN_API_SECRET --env production`. In dev, put it in `.dev.vars`.

### `requireAdminUser` — session **or** secret

Use this on endpoints the admin UI calls **and** scripts hit. It returns an `AdminContext` so the handler knows which path got in (useful for audit logging).

```ts
// server/utils/requireAdminUser.ts
import type { H3Event } from 'h3'
import { serverAuth } from './auth'

const DEFAULT_ADMIN_EMAILS = ['jamie@island-web.ca']

function adminEmails(event: H3Event): string[] {
  const env = event.context.cloudflare?.env
  const extra = (env?.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
  return [...DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...extra]
}

export interface AdminContext {
  user: { id: string; email: string; name?: string } | null
  via: 'session' | 'secret'
}

export const requireAdminUser = async (event: H3Event): Promise<AdminContext> => {
  const env = event.context.cloudflare?.env

  // 1. Machine path
  const secret = env?.ADMIN_API_SECRET
  const provided = getHeader(event, 'x-admin-secret') || (getQuery(event).secret as string | undefined)
  if (secret && provided && provided === secret) {
    return { user: null, via: 'secret' }
  }

  // 2. Session path — must be on the allow-list
  const session = await serverAuth(event).api.getSession({ headers: event.headers })
  if (!session?.user?.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })
  }
  if (!adminEmails(event).includes(session.user.email.toLowerCase())) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return {
    user: { id: session.user.id, email: session.user.email, name: session.user.name ?? undefined },
    via: 'session'
  }
}
```

A few design choices worth keeping:

- **Allow-list, not role column.** No `user.role` on the schema, no migration when promoting someone — add their email to `ADMIN_EMAILS` and redeploy. Less power, but you also can't accidentally `UPDATE user SET role='admin'` your way into a breach. Good fit for ≤ 5 admins.
- **Compiled-in default email.** `DEFAULT_ADMIN_EMAILS` keeps you locked-in even if `ADMIN_EMAILS` is unset (a misconfigured deploy can't accidentally lock everyone out).
- **Email lowercased everywhere.** Compare lowercased on both sides — Better Auth doesn't enforce a canonical case.

### Gating admin pages on the client

Pages under `/admin/*` use a route middleware that asks the server whether the visitor is an admin. Server is the source of truth — the middleware just calls `/api/admin/me` and bounces non-admins:

```ts
// app/middleware/admin.ts
export default defineNuxtRouteMiddleware(async (to) => {
  try {
    await useRequestFetch()('/api/admin/me')
  } catch {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
```

With:

```ts
// server/api/admin/me.get.ts
import { requireAdminUser } from '~~/server/utils/requireAdminUser'
export default defineEventHandler(async (event) => {
  const ctx = await requireAdminUser(event)
  return { user: ctx.user, via: ctx.via }
})
```

This **deliberately re-fetches on every navigation** — there's no client-side cache. Admin status is rare and the round-trip is cheap; better to be correct than fast.

Then each page in `app/pages/admin/*.vue` declares the middleware:

```vue
<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })
</script>
```

`auth` ensures a session exists; `admin` ensures it's an admin session.

---

## Adding social providers

```ts
// In serverAuth options:
socialProviders: {
  github: {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET
  }
}
```

Set the OAuth credentials as wrangler secrets. The CLI will add columns to the `account` table when you regenerate — apply the migration.

---

## Smoke test

```bash
# Public session lookup — should be 200 with null
curl -s http://localhost:3000/api/auth/get-session

# Request a magic link — should be 200 { status: true }
# The email lands in your Resend inbox immediately (no cron needed)
curl -s -X POST http://localhost:3000/api/auth/sign-in/magic-link \
  -H 'content-type: application/json' \
  -d '{"email":"test@example.com"}'
```

If the request fails with "D1 binding DB not found" — check [`10-gotchas.md`](./10-gotchas.md). It's almost always either the `compatibilityDate` or a missing `wrangler.jsonc`.

---

## Files to copy from `snippets/`

- `snippets/server/utils/auth.ts`
- `snippets/server/utils/auth.cli.ts`
- `snippets/server/api/auth/[...all].ts`
- `snippets/server/utils/requireUser.ts`
- `snippets/server/utils/requireAdmin.ts` (secret-only — machine endpoints)
- `snippets/server/utils/requireAdminUser.ts` (session-or-secret — admin UI)
- `snippets/server/api/admin/me.get.ts`
- `snippets/server/types/cloudflare.d.ts` (already in 01 — bindings include `BETTER_AUTH_SECRET`)
- `snippets/app/utils/auth-client.ts`
- `snippets/app/composables/useAuth.ts`
- `snippets/app/middleware/auth.ts`
- `snippets/app/middleware/admin.ts`
- `snippets/app/pages/login.vue`
- `snippets/server/db/migrations/0001_better_auth.sql`
- `snippets/server/emails/magic-link.ts` (sits in `server/emails/`; see [`05-email-resend.md`](./05-email-resend.md))
