---
trigger: always_on
---

# Database |

> Note: this file is named `mongoDb.md` for historical reasons only. **This app does not use MongoDB.** It uses **Cloudflare D1** (SQLite) via **Drizzle ORM**.

The schema lives in `server/db/schema.ts`; migrations are hand-rolled SQL in `server/db/migrations/` and applied with `wrangler d1 migrations apply` (see `package.json` scripts — `npm run dev` migrates the local DB first). Indexes are declared inline in the schema (`index()` / `uniqueIndex()`), so there's no separate index-analysis step.

User input is validated with **Zod** (`readZodBody` / `getZodQuery` — see `error-handling.md` and `server/AGENTS.md`).

## Accessing the DB

Cloudflare bindings are request-scoped, so build the Drizzle client per request with `useDb(event)`:

```ts
import { eq } from 'drizzle-orm'
import { flower } from '~~/server/db/schema'

const db = useDb(event)
const row = await db.select().from(flower).where(eq(flower.id, id)).get()
const list = await db.select().from(flower).where(eq(flower.growerId, user.id)).all()
// or the query API:
const sub = await db.query.subscription.findFirst({ where: eq(subscription.referenceId, user.id) })
```

## Types

Row types are inferred from the schema — `typeof flower.$inferSelect` (re-exported as `FlowerRow`, `ProfileRow`, etc.). There is **no** `BaseDocument`, `_id`, `ObjectId`, `ToMongoDoc`, or `getDocData` — those were MongoDB-stack conventions.

The wire/DTO types (what endpoints return) live in `shared/types/` (e.g. `FlowerDto`, `PublicProfileDto`): prices in pence, timestamps as epoch-ms, and **resolved `/img` URLs instead of raw R2 keys**. Map rows → DTOs with helpers like `toFlowerDto()`; never return a raw row that leaks R2 keys or private columns.

## Ownership

Ownership is keyed on Better Auth's `user.id` (a string). On app tables that's the `userId` / `growerId` / `referenceId` column. Resolve the current user with `requireUser(event)` and scope every query to them (and 403 on a mismatch for by-id reads). There is no separate "auth id vs user doc id" split — it's one `user.id`.
