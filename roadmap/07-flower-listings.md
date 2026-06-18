# 07 — Flower Listings (the killer feature)

**Goal:** let a grower build and continuously maintain their flower list — full
info + square photos + live availability — fast enough to do from a phone in the
field. This is the core of Stems; make it delightful.

**Depends on:** 05 (grower profile), 06 (image upload). **Blocks:** 08 (public page).

---

## Model recap (from doc 02)

`flower`: `name, variety, color, stemLengthCm, stemsPerBunch, pricePerStem,
pricePerBunch?, availability, notes, sortOrder, isArchived` + `flower_photo` (1:N,
square crops). **Live model** — every edit updates `updatedAt`; no weekly publish.

Availability enum + labels + colours: `shared/utils/flowers.ts`.
Pricing helpers: `shared/utils/price.ts` (`formatPence`, `bunchPrice`, `parsePounds`).

---

## `/flowers` — "My Flowers" manager — `app/pages/flowers.vue` (app layout, grower-only)

The grower's working surface. Guard: redirect non-growers to `/account` (with a
"Start growing" prompt).

- **List** of the grower's non-archived flowers as cards: square thumbnail,
  name + variety, `availability` `UBadge` (colour from `AVAILABILITY_COLOR`),
  price line (`formatPence(pricePerStem)/stem · formatPence(bunchPrice(f))/bunch`),
  and a quick **availability changer** (tap badge → cycle or open a small
  `USelectMenu`) so updating status is one tap — the most common weekly action.
- **Reorder** via drag handle (sets `sortOrder`) — nice-to-have; if skipped,
  order by `updatedAt desc`. Note which you shipped.
- **Add** via the center tab-bar `+` → opens the add/edit **bottom sheet**
  (`UDrawer` on mobile, `UModal` on desktop).
- Per-card overflow menu: Edit, Duplicate (great for "same flower, new colour"),
  Archive.
- **Empty state**: friendly `font-display` heading + "Add your first flower"
  primary button + a line about how the shareable link works.

---

## Add / edit flower — `app/components/Flower/FlowerForm.vue`

Used by both add and edit (drawer/modal). `UForm` + `UFormField`. Mobile-first:
big inputs, numeric keypads (`type="number" inputmode="decimal"`), Save pinned
at the bottom.

| Field | Control | Notes |
|---|---|---|
| Photo(s) | `<ImageUploader :maxSize="1280">` (doc 06) | V1: one primary photo (UI). Multiple supported by schema — wire a simple add-more if cheap, else single. |
| Name | `UInput` | required |
| Variety | `UInput` | optional ("Cupcake White") |
| Colour | `UInput` or `USelectMenu` w/ free text | optional |
| Stem length (cm) | `UInput` number | optional |
| Stems per bunch | `UInput` number | optional |
| Price per stem (£) | `UInput` w/ `£` prefix | parse via `parsePounds` → pence |
| Price per bunch (£) | `UInput` w/ `£` prefix | optional override; **placeholder shows auto value** `bunchPrice()` |
| Availability | `USelectMenu` of `AVAILABILITY_LABELS` | default `good` |
| Notes | `UTextarea` | optional, ≤ ~300 |

- **Auto bunch price:** as the grower types stem price + stems/bunch, show the
  derived bunch total live (e.g. greyed "£8.50"). Only persist `pricePerBunch`
  if they explicitly override it; otherwise leave null and derive on read.
- **Reusable presets** (handoff "listing library"): V1-lite — the **Duplicate**
  action covers most of this. A true preset library is V2; note it.
- Save: optimistic UI + toast. Errors revert + toast.

---

## API surface

All mutations: `requireUser`, then **ownership check** (`flower.growerId === user.id`)
→ `403` otherwise.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/flowers` | current grower's flowers (non-archived by default; `?archived=1` to include). Joins photos, returns `FlowerDto[]` with `photoUrls` resolved. |
| `POST` | `/api/flowers` | create. Body validated; `id = crypto.randomUUID()`; `sortOrder` = max+1; `createdAt/updatedAt = now`. Attaches uploaded photo keys → `flower_photo` rows. |
| `GET` | `/api/flowers/[id]` | single (owner). |
| `PATCH` | `/api/flowers/[id]` | partial update; bump `updatedAt`. Handles availability-only quick updates cheaply. |
| `DELETE` | `/api/flowers/[id]` | soft-delete → set `isArchived = true` (keep data + photos). Hard delete is V2. |
| `PATCH` | `/api/flowers/reorder` | optional: `{ ids: string[] }` → assign `sortOrder` by index. |

**Validation (server):** name required; numbers ≥ 0 and sane (length ≤ 300cm,
stems/bunch ≤ 1000, price ≤ £10,000 in pence); `availability` via
`isAvailability()`; photo keys must start with `public/` (doc 06). Coerce empty
strings → null. Reject prices that aren't integers (they should already be pence).

**Photos:** the form uploads each image to `/api/uploads` first (returns a key),
then the flower create/update receives the key list. Server inserts/reorders
`flower_photo` rows and (best-effort) deletes removed keys from R2.

---

## Performance / correctness notes
- `/api/flowers` should be one query + a photo join (or a second batched query
  keyed by flowerId), not N+1. With D1, prefer a single `leftJoin` and group in JS.
- Prices are pence integers everywhere; only convert at the `<input>` boundary.
- `updatedAt` must change on **every** edit (incl. availability-only) — it drives
  the public "Updated X ago" line.

## UX notes
- The single highest-frequency action is **changing availability** week to week.
  Make it one or two taps from `/flowers` without opening the full form.
- Camera-first photo flow (doc 06) — growers are outdoors on phones.
- Keep the form fast: optional fields collapsed under "More details" if it helps.

## Definition of done
- [ ] Grower can add, edit, duplicate, reorder(optional), and archive flowers.
- [ ] Photos upload as consistent squares and display on cards.
- [ ] Bunch price auto-derives and is overridable; everything stored in pence.
- [ ] Availability is one-tap updatable from the list; `updatedAt` bumps.
- [ ] All mutations enforce ownership (403 on others' flowers); inputs validated.
- [ ] `GET /api/flowers` avoids N+1.
- [ ] Non-growers can't reach `/flowers`.
- [ ] `npm run typecheck && npm run lint` clean; screenshots of list + form in PR.
