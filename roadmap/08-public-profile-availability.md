# 08 — Public Profile & Availability Page (the wedge)

**Goal:** the shareable, **logged-out** page at `stems.market/@handle` showing a
grower's about info and live flower availability — beautiful, fast, and SEO/social
friendly. This is the single most important screen in V1; a grower can use it
before any florist features exist.

**Depends on:** 05 (profile content), 07 (flowers). **Blocks:** 10 (share).

---

## Route — `app/pages/@[handle].vue` (default/public layout, no tab bar)

- Read `route.params.handle`, defensively strip a leading `@`, `normaliseHandle()`.
- SSR-fetch via `useFetch('/api/public/@'+handle)` so the page is server-rendered
  (good for link previews + first paint).
- Unknown / reserved / non-existent handle → `throw createError({ statusCode: 404 })`
  with a friendly not-found (`error.vue` exists).
- A **non-grower** profile renders the about section + a gentle "not currently
  listing flowers" state (no empty flower grid that looks broken).

---

## API — `GET /api/public/[handle].get.ts` (PUBLIC, no auth)

> Implemented as a normal route param; the page calls it with the bare handle.
> (`@` is only in the browser URL, not the API path.)

- `normaliseHandle`; look up `profile` by `handle`.
- `404` if missing.
- Returns `{ profile: PublicProfileDto, flowers: FlowerDto[] }` (doc 02):
  - `profile`: resolve `avatarUrl`/`bannerUrl` via `imgUrl()`.
  - `flowers`: non-archived, ordered by `sortOrder` then `updatedAt desc`,
    `photoUrls` resolved, **prices already resolved** (`pricePerBunch` derived if
    null). Exclude `sold_out`? **No** — show them with the Sold Out badge (signals
    range + "ask me"); they sort last.
- No private fields (postcode, email, lat/lng) in the public payload.
- Cache: this is public + changes only when the grower edits. Safe to set a short
  edge cache or `swr`. Don't over-engineer; correctness (fresh availability) beats
  caching — a 30–60s cache is plenty.

---

## Page layout (mobile-first, editorial)

```
┌─────────────────────────────┐
│  banner (or gradient)        │  ← bannerUrl or tasteful sage→cream gradient
│        ◯ avatar (overlap)    │
│  Farm Name        (font-display)
│  @handle · 📍 Location        │
│  bio …                        │
│  [Instagram] [Website] [Share]│
│  "Updated 2 days ago"         │  ← max(flowers.updatedAt) via useTimeAgo
├─────────────────────────────┤
│  Availability                 │
│  ┌──────┐ ┌──────┐            │  ← responsive grid of flower cards
│  │ img  │ │ img  │   (2-col mobile, more on wider)
│  │ name │ │ name │
│  │ £/st │ │ £/st │
│  │badge │ │badge │
│  └──────┘ └──────┘
└─────────────────────────────┘
```

### Flower card — `app/components/Flower/FlowerCard.vue` (shared with doc 07 list)
- Square photo (`rounded-lg`), graceful placeholder if none.
- Name + variety; colour chip optional.
- Price line: `formatPence(pricePerStem)`/stem · `formatPence(pricePerBunch)`/bunch
  (omit gracefully when a price is null).
- Stem length + stems/bunch as small meta ("60cm · 10/bunch").
- Availability `UBadge` (colour from `AVAILABILITY_COLOR`).
- Notes shown subtly (truncate, expand on tap).
- Tap → lightweight detail view (`UModal`/`UDrawer`) with the full photo + all
  fields. No edit affordances (public).

### Tasteful empty/edge states
- Grower with zero flowers: "Juliette hasn't listed any flowers yet — check back
  soon." + Instagram/website links still shown.
- Non-grower profile: about card only + "Browse growers" CTA → `/discover`.

---

## SEO & social sharing (matters — this is the link people paste)
- `useSeoMeta`: title `"{farmName} (@handle) · Stems"`, description from bio
  (truncated), `ogTitle/ogDescription/ogImage` (use bannerUrl or avatarUrl).
- `twitter:card = summary_large_image`.
- The page is SSR'd so WhatsApp/Instagram/iMessage previews render. Verify the
  OG image is an absolute URL.
- Add a JSON-LD `LocalBusiness`/`Person` block (nice-to-have) for richer results.

---

## "Updated X ago"
Compute from the most recently updated visible flower (`max(updatedAt)`), shown
with VueUse `useTimeAgo`. This is the trust signal that the list is live —
prominent but not shouty. If no flowers, omit.

---

## Definition of done
- [ ] `stems.market/@handle` renders SSR, logged-out, with about + live flowers.
- [ ] Unknown/reserved handles 404 cleanly.
- [ ] `GET /api/public/[handle]` returns no private fields; prices/URLs resolved.
- [ ] `FlowerCard` reused between this page and the grower's `/flowers` list.
- [ ] OG/Twitter meta produce a correct link preview (test paste into a chat app).
- [ ] "Updated X ago" reflects the latest edit.
- [ ] Looks polished at 375px; non-grower + empty states handled.
- [ ] `npm run typecheck && npm run lint` clean.
