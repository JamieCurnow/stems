# 09 — User Search & Discovery

**Goal:** let anyone (logged-out included) find growers by `@handle`, farm name,
or location text. This is V1 discovery — simple text search, no maps. Postcode
**radius** search is explicitly V2.

**Depends on:** 05 (profiles exist). Parallelisable with 08.

---

## `/discover` — `app/pages/discover.vue` (app layout; also linkable publicly)

- Prominent search `UInput` (icon `i-lucide-search`), debounced (~250ms).
- Default state (empty query): a browse list of growers — e.g. recently active
  (`profile.updatedAt` or latest flower `updatedAt`), `isGrower = true` first.
  Gives the page life before anyone searches.
- Results: list/grid of **grower cards** → avatar, farm name (`font-display`),
  `@handle`, location, a tiny "N flowers" / "Updated X ago" hint. Tap → `/@handle`.
- Empty results: friendly "No growers match '…' yet" + "Know a grower? Invite
  them" (mailto/share — cheap growth loop, optional).
- This page works logged-out (it's also reachable from the public layout); when
  signed in it sits under the app tab bar.

---

## API — `GET /api/search?q=<term>&limit=&cursor=` (PUBLIC)

- Trim `q`. If empty → return the browse list (recently active growers).
- Search across `profile.handle`, `profile.farmName`, `profile.locationName`
  with case-insensitive `LIKE '%term%'`. Prioritise: handle exact > handle prefix
  > farmName match > location match (order in JS or with `CASE` ranking).
- Filter to `isGrower = true` for V1 (non-growers aren't a discovery target yet);
  make this a constant so it's easy to relax later.
- Return `GrowerCardDto[]`: `{ handle, farmName, locationName, avatarUrl,
  flowerCount, lastActiveAt }`. Resolve `avatarUrl` via `imgUrl()`. Compute
  `flowerCount`/`lastActiveAt` with a grouped join (avoid N+1).
- Pagination: simple `limit` (default 20) + offset/cursor. V1 can use offset.

### Indexing
- `profile_handle_idx` + `profile_isGrower_idx` exist (doc 02). `LIKE '%…%'` won't
  use them for infix matches — fine at launch scale (tens–hundreds of growers).
- **Note for later (don't build now):** if growth demands it, add SQLite **FTS5**
  over `handle/farmName/locationName/bio`, or precompute a normalised search
  column. Flag in the PR; it's a V2 perf item.

---

## UX notes
- Mobile-first: search field sticky at top of `/discover`; results scroll under it.
- Show skeletons while loading (`USkeleton`).
- Location search is plain text in V1 ("Cornwall", "Devon") — set expectations in
  the placeholder: "Search growers by name or area".

## Out of scope (→ V2)
Map view, postcode radius / geodistance, filtering by flower/colour/availability
across growers, "near me" geolocation, following.

## Definition of done
- [ ] `/discover` searches by handle/farm/location with debounce; browse list
      shows when query is empty.
- [ ] `GET /api/search` is public, ranks results sensibly, returns resolved
      avatar URLs + flower counts without N+1.
- [ ] Results link to `/@handle`; empty + loading states handled.
- [ ] FTS/scale note left for V2.
- [ ] `npm run typecheck && npm run lint` clean.
