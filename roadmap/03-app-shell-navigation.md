# 03 — App Shell & Navigation

**Goal:** an app-like, mobile-first frame — bottom tab bar for signed-in users,
a clean minimal frame for public pages — with safe-area handling and PWA polish.

**Depends on:** 01 (theme). **Blocks:** every authed screen (04, 05, 07, 09).

---

## Layouts

Introduce `app/layouts/` (doesn't exist yet). Pages opt in with
`definePageMeta({ layout: 'app' })`.

### `app/layouts/app.vue` — signed-in shell
- Full-height column: scrollable `<slot/>` content + a fixed **bottom tab bar**.
- Top: lightweight contextual header per page (page title + optional action),
  not a heavy app bar. Many pages can omit it.
- Honour safe-area insets (notch / home indicator): the app already sets
  `viewport-fit=cover`. Pad the tab bar with `env(safe-area-inset-bottom)` and
  content with `env(safe-area-inset-top)` where a fixed header is used.
- Background `bg-default` (cream), content max-width ~ `max-w-screen-sm` centered
  so it looks intentional on desktop too.

### `app/layouts/default.vue` — public / marketing / profile
- Minimal: optional slim top bar with the **Stems** wordmark (links home) and a
  "Sign in" / "Open app" button. **No bottom tab bar.**
- Used by the public `/@handle` page, the landing page, login.

---

## Bottom tab bar — `app/components/Layout/AppTabBar.vue`

Custom component (Nuxt UI has no native bottom tab bar). Fixed to viewport
bottom, `bg-elevated` with top border, blur optional.

**V1 tabs (single-account model):**

| Tab | Icon (lucide) | Route | Notes |
|---|---|---|---|
| Discover | `i-lucide-search` | `/discover` | search + browse growers (doc 09) |
| My Flowers | `i-lucide-flower-2` | `/flowers` | **only shown if `profile.isGrower`** |
| Add | `i-lucide-plus` | opens add-flower drawer | center, emphasised; growers only |
| Profile | `i-lucide-user` | `/account` | your profile + settings |

- Non-growers see **Discover** and **Profile** only (plus a "Start growing" CTA
  on their profile that flips `isGrower`). Keep the bar honest — don't show
  grower tools to non-growers.
- Active state uses `text-primary`; inactive `text-muted`. 44px+ targets.
- The center **Add** is a raised circular `UButton` (primary) that opens the
  add-flower bottom sheet (`UDrawer`) defined in doc 07 — not a route.

```vue
<!-- shape only; wire routes/auth state via useAuth() + profile composable -->
<template>
  <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-elevated/95 backdrop-blur
              pb-[env(safe-area-inset-bottom)]">
    <ul class="mx-auto flex max-w-screen-sm items-center justify-around">
      <li v-for="t in tabs" :key="t.to">
        <NuxtLink :to="t.to" class="flex flex-col items-center gap-0.5 py-2 text-muted"
                  active-class="text-primary">
          <UIcon :name="t.icon" class="size-6" />
          <span class="text-[11px]">{{ t.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
```

---

## Routing map (V1)

```
/                         landing / redirect (signed-in → /discover)
/login                    magic link (exists)
/onboarding               claim @handle, farm name, isGrower (doc 04)
/discover                 search + browse (doc 09)            [app layout]
/flowers                  My Flowers manager (doc 07)          [app layout, grower]
/flowers/[id]             edit a flower (or drawer)            [app layout, grower]
/account                  your profile + settings (doc 05)     [app layout]
/account/edit             edit profile / about                 [app layout]
/@[handle]                PUBLIC profile + availability (doc 08) [default layout]
```

> **Reserved-handle guard:** because `/@handle` shares the root namespace,
> every top-level segment above (`discover`, `flowers`, `account`, `login`,
> `onboarding`) must be in `RESERVED_HANDLES` (doc 02). The `@` prefix already
> disambiguates profile URLs from app routes — keep it.

### The `@handle` route
Create the page at **`app/pages/@[handle].vue`** (the `@` is a literal URL
character; the file/route resolves to `/@:handle`). In the page, read
`route.params.handle`, strip a leading `@` defensively, and fetch the public
profile. Return a proper 404 (`createError({ statusCode: 404 })`) for unknown or
reserved handles.

---

## PWA polish (consume, don't rebuild)

`@vite-pwa/nuxt` is already configured. In this doc:
- Confirm `start_url: '/app'`… **change it to `/discover`** (or `/`) since there's
  no `/app` route. Update `nuxt.config.ts` `pwa.manifest.start_url`.
- Ensure `theme_color`/`background_color` are the brand cream (done in doc 01).
- Add an **"Add to Home Screen"** nudge for growers after onboarding (optional,
  use the `beforeinstallprompt` event; keep it dismissible and non-naggy).
- Keep the existing offline page + image runtime caching.

---

## UX notes
- Design at 375px first. The shell should feel like a native app: content
  scrolls under a translucent tab bar; primary action is thumb-reachable.
- Page transitions: subtle fade. Use Nuxt's `<NuxtPage>` transition.
- Don't show the tab bar on public profile pages — those are shareable web pages,
  not the app.

## Definition of done
- [ ] `layouts/app.vue` + `layouts/default.vue` exist; pages set the right one.
- [ ] `AppTabBar.vue` renders correct tabs per `isGrower`; active states work;
      safe-area padding verified on an iPhone-sized viewport.
- [ ] `/@[handle].vue` route resolves and 404s on reserved/unknown handles.
- [ ] `start_url` fixed; install nudge optional but doesn't error.
- [ ] `npm run typecheck && npm run lint` clean; screenshot at 375px in PR.
