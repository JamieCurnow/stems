# 04 — Auth & Onboarding

**Goal:** keep the existing magic-link sign-in, then route every new user
through a one-screen onboarding that claims a unique `@handle`, captures the
farm name + location, and sets the `isGrower` flag — creating their `profile` row.

**Depends on:** 02 (profile table, handle utils), 03 (layouts/middleware).
**Blocks:** 05, 07, 08.

---

## What already exists (don't rebuild)
- Better Auth with **magic-link** email (`server/utils/auth.ts`, `server/emails/magic-link.ts`).
- `app/pages/login.vue`, `app/composables/useAuth.ts`, `app/utils/auth-client.ts`.
- `app/middleware/auth.ts` (route protection).
- `requireUser(event)` server helper.

Your job is the **onboarding gate + handle claim**, not the auth mechanism.

---

## Onboarding flow

```
Magic link sign-in ──▶ has profile row?
                         ├─ no  → /onboarding  (claim handle, farm name, location, isGrower)
                         └─ yes → /discover (or original destination)
```

A user "exists" (Better Auth `user` row) the moment they click the magic link,
but they have **no `profile` row** until onboarding completes. Gate on profile
existence.

### Server: profile existence + "me" endpoint

`server/api/profile/me.get.ts` — returns the current user's profile or `null`.
```ts
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)
  const row = await db.select().from(profile).where(eq(profile.userId, user.id)).get()
  return row ?? null
})
```

### Client: onboarding composable / middleware
- Add `app/middleware/onboarding.ts` (global or applied on the `app` layout
  pages): if signed in **and** `profile === null` **and** not already on
  `/onboarding`, redirect to `/onboarding`. If on `/onboarding` with a profile,
  bounce to `/discover`.
- Fetch profile once and cache (Pinia store `useProfileStore` or a
  `useProfile()` composable backed by `useState`). Many features read it
  (tab bar `isGrower`, ownership checks) — make it a shared source of truth.

---

## `/onboarding` page — `app/pages/onboarding.vue`

Single, friendly, mobile-first screen (use `UForm` + `UFormField`). Layout:
`app` layout without the tab bar, or a focused minimal layout.

**Fields:**
| Field | Control | Rules |
|---|---|---|
| Username (`@handle`) | `UInput` with `@` prefix slot | `validateHandle()` (doc 02) + **live availability check** |
| Farm / display name | `UInput` | required, 1–80 chars |
| Location | `UInput` | optional freeform e.g. "Bissoe, Cornwall" |
| Postcode | `UInput` | optional (stored for V2 radius search) |
| "I grow flowers and want to list them" | `USwitch` | sets `isGrower`; default **on** (this is a growers-first launch) |

- **Live handle check:** debounced `GET /api/profile/handle-available?handle=`.
  Show green tick / red message inline. Final claim is still validated server-side
  (race-safe via the unique index).
- Copy: warm and human. Header in `font-display`: "Claim your Stems page".
  Subtext: "This is your shareable link — `stems.app/@yourname`."
- Submit → `POST /api/profile` creates the row → redirect to `/account` (so they
  immediately see their page) or straight to `/flowers` with an "add your first
  flower" empty state.

---

## API surface

### `GET /api/profile/handle-available?handle=<raw>`
Public-ish (require auth to limit abuse). Returns `{ available: boolean, error?: string }`.
- Run `validateHandle()` first (format + reserved).
- Then check `profile.handle` uniqueness (case-insensitive: store + compare lowercase).

### `POST /api/profile` — create profile (onboarding)
- `requireUser`. **409** if a profile already exists for this user.
- Body: `{ handle, farmName, locationName?, postcode?, isGrower }`.
- `normaliseHandle` + `validateHandle`; re-check availability; insert with
  `crypto.randomUUID()`-free PK (PK is `userId`). Set `createdAt`/`updatedAt = Date.now()`.
- Handle the unique-constraint race: catch the constraint error → `409` "username
  just got taken".
- Returns the created profile.

> Profile **editing** (bio, avatar, instagram, etc.) lives in doc 05 via
> `PATCH /api/profile`. Onboarding only needs the minimum to exist + be findable.

---

## Edge cases
- User abandons onboarding (signed in, no profile): every gated page bounces them
  back to `/onboarding`. Public pages still work.
- Reserved/taken handle at submit time → inline error, don't lose the other fields.
- Non-grower (`isGrower = false`): allowed. They get a profile + can browse;
  their public page shows "not currently listing" and a CTA. They can flip the
  switch later from `/account` (doc 05).
- Deleting account is out of V1 scope (note in backlog).

---

## Definition of done
- [ ] New users without a profile are routed to `/onboarding` and can't reach
      gated app pages until it's complete.
- [ ] Handle is validated (format + reserved + uniqueness), with live inline
      availability feedback and a race-safe server claim.
- [ ] `POST /api/profile` creates the row; `isGrower` persists; tab bar reflects it.
- [ ] `useProfile()`/store exposes the current profile app-wide.
- [ ] Magic-link login still works end-to-end (didn't regress).
- [ ] `npm run typecheck && npm run lint` clean.
