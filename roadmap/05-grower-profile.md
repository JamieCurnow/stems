# 05 — Grower Profile & About Page

**Goal:** let a signed-in user manage their profile — the content that powers
their public about page: farm name, bio, location, Instagram/website, avatar,
banner — plus toggle `isGrower`.

**Depends on:** 04 (profile exists), 06 (image upload). **Blocks:** 08 (public page).

---

## Scope

- `/account` — view your own profile + entry points to edit, settings, sign out.
- `/account/edit` — edit profile / about content.
- `PATCH /api/profile` — persist edits.
- The **public** rendering of this content lives in doc 08; this doc owns the
  data + the owner-facing edit experience.

---

## `/account` — `app/pages/account.vue` (app layout)

Owner's home for identity.
- Header card: avatar (`UAvatar`, round), farm name (`font-display`), `@handle`,
  location, "View public page →" link to `/@handle`.
- If `isGrower`: quick link to **My Flowers** (doc 07) + a count.
- If **not** `isGrower`: a "Start growing" `UButton` that flips the switch
  (`PATCH /api/profile { isGrower: true }`) and reveals grower tools.
- Buttons: **Edit profile** (`/account/edit`), **Share my page** (doc 10),
  **Sign out** (existing auth-client).
- Settings worth surfacing in V1: email preferences (an endpoint already exists —
  `/api/email/preferences`), dark-mode toggle (color mode is wired). Keep minimal.

---

## `/account/edit` — `app/pages/account/edit.vue`

`UForm` + `UFormField`, mobile-first, bottom "Save" button.

| Field | Control | Notes |
|---|---|---|
| Avatar | `<ImageUploader shape="round" :maxSize="512">` (doc 06) | round display, square crop |
| Banner (optional) | `<ImageUploader :maxSize="1280">` | wide hero on public page; optional in V1 |
| Farm / display name | `UInput` | required, ≤ 80 |
| Bio / about | `UTextarea` | ≤ ~1000 chars; plain text or markdown-lite (render safely in doc 08) |
| Location | `UInput` | freeform |
| Postcode | `UInput` | optional; stored for V2 radius search |
| Instagram | `UInput` (`@` prefix) | store handle without `@`; validate `[A-Za-z0-9._]` |
| Website | `UInput` | validate URL; store normalised `https://…` |
| "I grow flowers" | `USwitch` | toggles `isGrower` |

- **Handle is shown but editing it is V1-optional** — changing a handle breaks
  shared links. If you allow it: same validation as onboarding + warn "your old
  link will stop working". Otherwise display read-only with a "contact support to
  change" note. **Recommended V1: read-only handle.**
- Avatar/banner: when replaced, capture the new key; optionally delete the old
  R2 object (best-effort, ignore failure).
- Autosave is nice-to-have; explicit Save is fine for V1. Toast on success.

---

## API — `PATCH /api/profile`

- `requireUser`. Loads the caller's profile; **404** if none (shouldn't happen
  post-onboarding).
- Body: partial of `{ farmName, bio, locationName, postcode, instagram, website,
  avatarKey, bannerKey, isGrower }`. Ignore unknown keys. (Handle only if you
  chose to allow renames — then re-validate via doc 02 utils + uniqueness.)
- Validate each provided field (lengths, URL, instagram charset). Normalise
  website to include scheme. Trim strings; coerce empty → `null`.
- Set `updatedAt = Date.now()`. Persist. Return the updated profile.
- Refresh the client `useProfile()` cache after save so the tab bar / `/account`
  update immediately.

---

## Public about content (handed to doc 08)
The public page (doc 08) renders: banner (or a tasteful gradient fallback),
avatar, farm name, `@handle`, location, bio, Instagram/website links, and the
live flower list. This doc just guarantees those fields are captured and
returned via the `PublicProfileDto` (doc 02) with `avatarUrl`/`bannerUrl`
resolved through `imgUrl()`.

---

## UX notes
- Empty bio / no avatar should still look good — provide friendly placeholders
  (initials avatar, "Tell florists about your flowers…" prompt).
- Keep the edit form short and scannable; group "About" and "Links" visually.
- Validate inline; don't block save on optional-field nitpicks.

## Definition of done
- [ ] `/account` shows identity + correct grower/non-grower actions; sign-out works.
- [ ] `/account/edit` edits all fields, uploads avatar (+ optional banner) via
      `<ImageUploader>`, and persists through `PATCH /api/profile`.
- [ ] `isGrower` toggle works and updates the tab bar live.
- [ ] Field validation (lengths, URL, instagram) enforced client + server.
- [ ] Handle policy decided (recommended: read-only) and implemented.
- [ ] `npm run typecheck && npm run lint` clean.
