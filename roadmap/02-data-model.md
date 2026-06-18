# 02 — Data Model (single source of truth)

Every V1 table, enum, and shared util. **Do not invent column names elsewhere —
import from here.** Follows the repo conventions in [`00-conventions.md`](./00-conventions.md):
app-owned tables, `crypto.randomUUID()` text IDs, `timestamp_ms` dates, integer
booleans, money as integer pence, and **no new columns on Better Auth's `user`**.

**Depends on:** nothing. **Blocks:** 04, 05, 07, 08, 09.

---

## Entity overview

```
user (Better Auth, read-only here)
  └─1:1─ profile        @handle, farmName, location, isGrower, avatar/banner keys
            │
grower (== user with profile.isGrower = true)
  └─1:N─ flower         name, variety, colour, lengths, prices (pence), availability
            └─1:N─ flower_photo   r2Key (square crops in public R2)
```

V1 has **three new tables**: `profile`, `flower`, `flower_photo`.

---

## Drizzle schema additions

Append to `server/db/schema.ts`. Note the extra import: `real` (for lat/lng).

```ts
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core'

/* ── Profile (1:1 with user) ──────────────────────────────────────────────
   App-owned. Keyed by Better Auth's user.id. Holds everything that makes a
   grower's public page. Florist-specific fields are deferred to V2. */
export const profile = sqliteTable(
  'profile',
  {
    userId: text('userId')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    handle: text('handle').notNull().unique(), // lowercase canonical, no '@'
    farmName: text('farmName').notNull(),       // display name / farm name
    bio: text('bio'),                           // about-page body (plain text/markdown-lite)
    locationName: text('locationName'),         // freeform e.g. "Bissoe, Cornwall"
    postcode: text('postcode'),                 // stored for future radius search (V2)
    latitude: real('latitude'),                 // optional geocode (V2 search); nullable in V1
    longitude: real('longitude'),
    instagram: text('instagram'),               // handle without '@'
    website: text('website'),
    avatarKey: text('avatarKey'),               // R2 key (see doc 06)
    bannerKey: text('bannerKey'),               // R2 key, optional hero image
    isGrower: integer('isGrower', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull()
  },
  (t) => [
    uniqueIndex('profile_handle_idx').on(t.handle),
    index('profile_isGrower_idx').on(t.isGrower)
  ]
)

/* ── Flower listing (1:N from grower) ────────────────────────────────────
   The live, continuously-editable availability item. No weekly snapshot.
   `updatedAt` powers the public "Updated 2 days ago" line. */
export const flower = sqliteTable(
  'flower',
  {
    id: text('id').primaryKey(),
    growerId: text('growerId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),              // "Cosmos"
    variety: text('variety'),                  // "Cupcake White"
    color: text('color'),                      // freeform "White", "Blush pink"
    stemLengthCm: integer('stemLengthCm'),     // 60
    stemsPerBunch: integer('stemsPerBunch'),   // 10
    pricePerStem: integer('pricePerStem'),     // pence, e.g. 85 = £0.85
    pricePerBunch: integer('pricePerBunch'),   // pence; optional override, else derived
    availability: text('availability').notNull().default('good'), // see AVAILABILITY
    notes: text('notes'),
    sortOrder: integer('sortOrder').notNull().default(0),
    isArchived: integer('isArchived', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull()
  },
  (t) => [
    index('flower_growerId_idx').on(t.growerId),
    index('flower_grower_archived_idx').on(t.growerId, t.isArchived)
  ]
)

/* ── Flower photos (1:N) ─────────────────────────────────────────────────
   Square crops stored in public R2 (doc 06). V1 UI manages one primary photo
   (lowest sortOrder), but the table supports a gallery for V2 with no migration. */
export const flowerPhoto = sqliteTable(
  'flower_photo',
  {
    id: text('id').primaryKey(),
    flowerId: text('flowerId')
      .notNull()
      .references(() => flower.id, { onDelete: 'cascade' }),
    r2Key: text('r2Key').notNull(),
    sortOrder: integer('sortOrder').notNull().default(0),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull()
  },
  (t) => [index('flower_photo_flowerId_idx').on(t.flowerId)]
)

export type ProfileRow = typeof profile.$inferSelect
export type FlowerRow = typeof flower.$inferSelect
export type FlowerPhotoRow = typeof flowerPhoto.$inferSelect
```

---

## Migrations

Two new files (existing repo is at `0005`). Keep DDL in lock-step with the
schema above.

### `server/db/migrations/0006_profiles.sql`
```sql
CREATE TABLE IF NOT EXISTS profile (
  userId       TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  handle       TEXT NOT NULL UNIQUE,
  farmName     TEXT NOT NULL,
  bio          TEXT,
  locationName TEXT,
  postcode     TEXT,
  latitude     REAL,
  longitude    REAL,
  instagram    TEXT,
  website      TEXT,
  avatarKey    TEXT,
  bannerKey    TEXT,
  isGrower     INTEGER NOT NULL DEFAULT 0,
  createdAt    INTEGER NOT NULL,
  updatedAt    INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS profile_handle_idx ON profile(handle);
CREATE INDEX IF NOT EXISTS profile_isGrower_idx ON profile(isGrower);
```

### `server/db/migrations/0007_flowers.sql`
```sql
CREATE TABLE IF NOT EXISTS flower (
  id            TEXT PRIMARY KEY,
  growerId      TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  variety       TEXT,
  color         TEXT,
  stemLengthCm  INTEGER,
  stemsPerBunch INTEGER,
  pricePerStem  INTEGER,
  pricePerBunch INTEGER,
  availability  TEXT NOT NULL DEFAULT 'good',
  notes         TEXT,
  sortOrder     INTEGER NOT NULL DEFAULT 0,
  isArchived    INTEGER NOT NULL DEFAULT 0,
  createdAt     INTEGER NOT NULL,
  updatedAt     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS flower_growerId_idx ON flower(growerId);
CREATE INDEX IF NOT EXISTS flower_grower_archived_idx ON flower(growerId, isArchived);

CREATE TABLE IF NOT EXISTS flower_photo (
  id        TEXT PRIMARY KEY,
  flowerId  TEXT NOT NULL REFERENCES flower(id) ON DELETE CASCADE,
  r2Key     TEXT NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS flower_photo_flowerId_idx ON flower_photo(flowerId);
```

After writing: `npm run db:migrate` (local) and confirm tables exist.

---

## Shared enums & utils

### `shared/utils/flowers.ts` (new)
```ts
export const AVAILABILITY = ['good', 'limited', 'very_limited', 'midweek', 'sold_out'] as const
export type Availability = (typeof AVAILABILITY)[number]

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  good: 'Good',
  limited: 'Limited',
  very_limited: 'V. Limited',
  midweek: 'Midweek',
  sold_out: 'Sold Out'
}

/** Maps to Nuxt UI semantic colours defined in doc 01. */
export const AVAILABILITY_COLOR: Record<Availability, 'success' | 'primary' | 'error' | 'secondary' | 'neutral'> = {
  good: 'success',
  limited: 'primary',
  very_limited: 'error',
  midweek: 'secondary',
  sold_out: 'neutral'
}

export const isAvailability = (v: unknown): v is Availability =>
  typeof v === 'string' && (AVAILABILITY as readonly string[]).includes(v)
```

### `shared/utils/price.ts` (new)
```ts
/** 85 → "£0.85". Null/undefined → ''. */
export const formatPence = (pence?: number | null): string =>
  pence == null ? '' : `£${(pence / 100).toFixed(2)}`

/** Resolve the per-bunch price: explicit override, else stem × count, else null. */
export const bunchPrice = (f: {
  pricePerStem?: number | null
  pricePerBunch?: number | null
  stemsPerBunch?: number | null
}): number | null => {
  if (f.pricePerBunch != null) return f.pricePerBunch
  if (f.pricePerStem != null && f.stemsPerBunch != null) return f.pricePerStem * f.stemsPerBunch
  return null
}

/** Parse a "£8.50" / "8.5" string from a form into integer pence. */
export const parsePounds = (input: string): number | null => {
  const n = Number(String(input).replace(/[£,\s]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : null
}
```

### `shared/utils/handle.ts` (new)
```ts
export const HANDLE_RE = /^[a-z][a-z0-9_]{2,29}$/ // 3–30 chars, starts with a letter

export const RESERVED_HANDLES = new Set([
  'app', 'api', 'admin', 'auth', 'login', 'logout', 'signup', 'signin',
  'onboarding', 'settings', 'account', 'me', 'new', 'edit', 'search',
  'discover', 'explore', 'about', 'help', 'support', 'terms', 'privacy',
  'img', 'images', 'r', 'email', 'unsubscribe', 'billing', 'stripe',
  'flowers', 'flower', 'grower', 'growers', 'florist', 'stems', 'www', 'static'
])

export const normaliseHandle = (raw: string): string => raw.trim().replace(/^@/, '').toLowerCase()

/** null = valid; otherwise a human error message. */
export const validateHandle = (raw: string): string | null => {
  const h = normaliseHandle(raw)
  if (!HANDLE_RE.test(h)) return '3–30 chars, letters/numbers/underscore, starting with a letter.'
  if (RESERVED_HANDLES.has(h)) return 'That username is reserved.'
  return null
}
```

> The reserved list **must** stay in sync with any top-level route segments
> introduced (search, discover, settings, etc.). If you add a root route, add it
> here too — otherwise `@reserved` collides with `/reserved`.

---

## DTOs (suggested — put in `shared/types/`)

Keep client/server in agreement. Minimum shapes:

```ts
// shared/types/profile.ts
export interface PublicProfileDto {
  handle: string
  farmName: string
  bio: string | null
  locationName: string | null
  instagram: string | null
  website: string | null
  avatarUrl: string | null   // resolved /img URL, not raw key
  bannerUrl: string | null
  isGrower: boolean
}

// shared/types/flower.ts
import type { Availability } from '~~/shared/utils/flowers'
export interface FlowerDto {
  id: string
  name: string
  variety: string | null
  color: string | null
  stemLengthCm: number | null
  stemsPerBunch: number | null
  pricePerStem: number | null   // pence
  pricePerBunch: number | null  // pence (resolved or override)
  availability: Availability
  notes: string | null
  sortOrder: number
  photoUrls: string[]           // resolved /img URLs, primary first
  updatedAt: number             // epoch ms
}
```

API handlers resolve R2 keys → `/img/...` URLs (doc 06) before returning; the
client never sees raw keys.

---

## Definition of done
- [ ] Schema additions compile (`npm run typecheck`).
- [ ] `0006` + `0007` migrations apply cleanly on a fresh local DB.
- [ ] `shared/utils/{flowers,price,handle}.ts` exist and are imported by features.
- [ ] DTO types exist under `shared/types/`.
