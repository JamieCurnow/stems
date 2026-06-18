# 00 — Conventions (read me first, every task)

This is the contract every Stems feature must honour. It encodes the patterns
already in the repo so agents working in parallel produce consistent code.

---

## Project shape

```
app/                      # Nuxt client (Vue 3, <script setup lang="ts">)
  assets/css/main.css     # Tailwind v4 + Nuxt UI entry; brand @theme lives here
  app.config.ts           # Nuxt UI semantic colour assignments
  components/              # PascalCase; subfolders become prefixes (Layout/Foo → <LayoutFoo>)
  composables/            # useXxx()
  layouts/                # ⚠️ not present yet — created in doc 03
  middleware/             # route middleware (auth.ts, admin.ts, subscription.ts exist)
  pages/                  # file-based routing
  plugins/                # *.client.ts etc.
  utils/                  # auth-client.ts etc.
server/                   # Nitro server (Cloudflare Worker)
  api/                    # /api/* endpoints, suffix = method (foo.get.ts, foo.post.ts)
  routes/                 # non-/api routes (e.g. /r/[code], /img/[...])
  db/schema.ts            # Drizzle schema (single file)
  db/migrations/          # hand-rolled SQL, zero-padded sequential
  durable-objects/        # DO classes
  emails/                 # Resend templates
  utils/                  # db.ts, auth.ts, requireUser.ts, ...
shared/utils/             # imported by BOTH client and server (constants, formatters)
```

---

## Database access

Bindings don't exist at module load on Workers — **always** get the DB per
request inside the handler:

```ts
import { useDb } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = useDb(event)            // Drizzle client bound to this request's D1
  // ...
})
```

- ORM is **Drizzle**. Query via `db.select()...`, `db.insert(table).values(...)`, etc.
- Schema lives in `server/db/schema.ts`. Add new tables there **and** ship a SQL migration.
- App-owned date columns use `integer({ mode: 'timestamp_ms' })` (epoch millis).
  Booleans use `integer({ mode: 'boolean' })`. Money uses plain `integer` (pence).
- **Never write to Better-Auth-managed tables** (`user`, `session`, `account`,
  `verification`, `subscription`) via Drizzle. Read-only is fine. Per-user app
  data goes in **new app tables keyed by `userId`** (see the `profile` table in doc 02),
  not new columns on `user`.

### Migrations

- Files: `server/db/migrations/NNNN_short_name.sql`, zero-padded, sequential.
  Existing repo uses `0001`–`0005`. **New V1 migrations start at `0006`.**
- Apply locally with the existing scripts:
  - `npm run db:migrate` → `wrangler d1 migrations apply stems --local`
  - `npm run dev` runs `db:migrate` then `nuxt dev`.
- Write idempotent-ish DDL (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`)
  and keep the Drizzle schema in lock-step with the SQL.

### IDs

Generate text primary keys with **`crypto.randomUUID()`** (available in the
Workers runtime and local Miniflare). Don't pull in a nanoid dependency for V1.

```ts
const id = crypto.randomUUID()
```

---

## Auth

Session-cookie based via Better Auth.

```ts
import { requireUser } from '~~/server/utils/requireUser'      // throws 401 if no session
const user = await requireUser(event)                          // { id, email, name, ... }
```

- Use `requireUser(event)` at the top of any endpoint that mutates or reads
  private data.
- For **public** endpoints (public profile, search, image serving) do **not**
  call `requireUser` — these must work logged-out.
- For "optional auth" (e.g. show an Edit button if the viewer owns the profile),
  resolve the session without throwing:
  ```ts
  const session = await serverAuth(event).api.getSession({ headers: event.headers })
  const viewerId = session?.user?.id ?? null
  ```
- Client side: `useAuth()` composable + `auth-client.ts`. Route protection via
  `app/middleware/auth.ts`.

---

## API conventions

- Endpoints live in `server/api/`. Filename suffix sets the method:
  `flowers.get.ts`, `flowers.post.ts`, `flowers/[id].patch.ts`, `flowers/[id].delete.ts`.
- Read body with `await readBody(event)`, params with `getRouterParam(event, 'id')`,
  query with `getQuery(event)`.
- **Validate input.** Use [Zod](https://zod.dev) (add to deps if not present) or
  manual guards; return `createError({ statusCode: 400, statusMessage })` on bad input.
- Throw `createError({ statusCode, statusMessage })` for errors — never return ad-hoc
  error shapes.
- Return plain serialisable objects; Nitro JSON-encodes them.
- Ownership checks: when mutating a flower/profile, confirm the row's `growerId`/
  `userId` matches `user.id`, else `403`.

### Client data fetching

- Use `useFetch` / `$fetch` with explicit generics: `await $fetch<FlowerDto>('/api/...')`.
- Type DTOs in `shared/types/` (create as needed) so client and server agree.
- Prefer `useFetch` in pages for SSR-friendly loads; `$fetch` for mutations.

---

## Money & formatting

- Prices are **integer pence** end-to-end. Convert at the input boundary only.
- Use the shared formatters in `shared/utils/price.ts` (defined in doc 02):
  `formatPence(85) === '£0.85'`, `bunchPrice(flower)` derives bunch total.

## Dates

- Store epoch millis (`timestamp_ms`). For "Updated 2 days ago" use VueUse's
  `useTimeAgo`. Render absolute dates with `Intl.DateTimeFormat('en-GB', …)`.

---

## UI

- **Always use Nuxt UI 4 components** (`UButton`, `UInput`, `UForm`, `UModal`,
  `UCard`, `UBadge`, `UAvatar`, `UDrawer`, `USelectMenu`, `UNavigationMenu`, …)
  before hand-rolling. Icons via Lucide (`i-lucide-*`) — `@iconify-json/lucide`
  is installed.
- Brand colours are wired through Nuxt UI semantic names (`primary`, `secondary`,
  `success`, `error`, `neutral`) — see doc 01. **Use semantic classes**
  (`text-primary`, `bg-elevated`, `text-muted`) not raw hex.
- Mobile-first: design at 375px width first, enhance up. Respect safe-area insets.
- Dark mode exists (system-driven). Don't hardcode light-only colours; use the
  semantic tokens which adapt.

---

## Quality gates (run before saying "done")

```bash
npm run lint          # eslint
npm run typecheck     # nuxt typecheck (vue-tsc)
npm run format:check  # prettier
```

- Prettier + ESLint config are committed; match the existing style (2-space
  indent, single quotes, no semicolons where the config omits them — let prettier decide).
- Keep comments at the density of surrounding files: explain *why*, not *what*.
- Don't add dependencies casually. If you need one (e.g. `zod`, a cropper lib),
  call it out in the PR and prefer well-maintained, small packages.

---

## Things that will bite you (repo-specific)

- **`*.md` files are ignored by Nuxt/Nitro** (`ignore: ['**/*.md']`) — these docs
  won't be scanned into the build. Good.
- **`worker-configuration.d.ts`** is gitignored and excluded from the TS program
  on purpose; don't re-include it.
- R2/DO bindings: the example R2 bucket is **commented out** in `wrangler.jsonc`.
  Doc 06 turns it on. DO bindings are declared **per-env**, not top-level.
- In `nuxt dev`, Miniflare runs the Nitro bundle without the DO wrapper, so DO
  features degrade gracefully — not relevant to V1 flowers, just know it.
- `compatibilityDate` must stay ≥ `2025-07-15` or CF bindings silently vanish in dev.
