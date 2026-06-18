# 01 — Design System & Theme

**Goal:** translate the Stems brand into Nuxt UI 4 + Tailwind v4 conventions so
every screen is consistent, warm, and app-like out of the box. This doc ships
the theme tokens and the base look-and-feel; other docs consume them.

**Depends on:** nothing. **Blocks:** everything visual (03, 05, 07, 08).

---

## Brand

- **Name:** Stems
- **Slogan:** "The marketplace for local-grown flowers"
- **Feel:** warm, earthy, hand-grown, editorial. Think a sunlit Cornish
  allotment, not a SaaS dashboard. Generous whitespace, soft shadows, rounded
  corners, large tappable targets, real photography front-and-centre.

### Source palette (given)

```
--color-primary:        #CB5F36   (terracotta)
--color-primary-light:  #FFCBA4
--color-primary-dark:   #A0492A
--color-secondary:      #7E9476   (sage green)
--color-success:        #5B8C5A
--color-error:          #D64545
--color-background:     #FBF4ED   (warm cream)
--color-surface:        #FFFFFF
--color-border:         #ECE1D7
--color-text:           #2C2521
--color-text-muted:     #6B5D53
```

---

## How Nuxt UI 4 theming works (important)

Nuxt UI 4 (on Tailwind v4) resolves colours through **semantic aliases** —
`primary`, `secondary`, `success`, `info`, `warning`, `error`, and `neutral`.
Each alias points at a named colour with a full **50→950** shade scale. We:

1. Define custom shade scales as CSS variables in `app/assets/css/main.css` via
   Tailwind's `@theme`.
2. Map the semantic aliases to those scales in `app/app.config.ts`.
3. Override Nuxt UI's design tokens (`--ui-bg`, `--ui-text`, …) to the warm
   surfaces so backgrounds/borders/text match the brand, in both light and dark.

This means components (`UButton color="primary"`, `UBadge color="success"`, …)
automatically render in-brand. **Never hardcode hex in components** — use
semantic utility classes (`bg-primary`, `text-muted`, `bg-elevated`, `border-default`).

---

## Deliverable 1 — `app/assets/css/main.css`

Replace the current two-line file with the full theme. Shade scales below are
derived from the brand anchors (primary 500 = `#CB5F36`, light 200, dark 700;
neutral is a warm "clay" ramp anchored on the cream background and the text colour).

```css
@import 'tailwindcss';
@import '@nuxt/ui';

@theme {
  /* ── Terracotta (primary) ─────────────────────────────── */
  --color-terracotta-50: #fdf4ef;
  --color-terracotta-100: #fbe7da;
  --color-terracotta-200: #ffcba4; /* brand: primary-light */
  --color-terracotta-300: #f3a878;
  --color-terracotta-400: #e5814f;
  --color-terracotta-500: #cb5f36; /* brand: primary */
  --color-terracotta-600: #b85230;
  --color-terracotta-700: #a0492a; /* brand: primary-dark */
  --color-terracotta-800: #813a23;
  --color-terracotta-900: #6a311f;
  --color-terracotta-950: #3a1810;

  /* ── Sage (secondary) ─────────────────────────────────── */
  --color-sage-50: #f4f6f2;
  --color-sage-100: #e6ebe2;
  --color-sage-200: #cdd7c6;
  --color-sage-300: #aebfa4;
  --color-sage-400: #94a888;
  --color-sage-500: #7e9476; /* brand: secondary */
  --color-sage-600: #66795f;
  --color-sage-700: #51614c;
  --color-sage-800: #434f40;
  --color-sage-900: #394236;
  --color-sage-950: #1e241c;

  /* ── Leaf (success) ───────────────────────────────────── */
  --color-leaf-50: #f1f7f1;
  --color-leaf-100: #deecdd;
  --color-leaf-200: #bfd9bd;
  --color-leaf-300: #97c096;
  --color-leaf-400: #74a873;
  --color-leaf-500: #5b8c5a; /* brand: success */
  --color-leaf-600: #487147;
  --color-leaf-700: #3b5a3a;
  --color-leaf-800: #314830;
  --color-leaf-900: #293c29;
  --color-leaf-950: #122011;

  /* ── Rose (error) ─────────────────────────────────────── */
  --color-rose-50: #fcf1f1;
  --color-rose-100: #f9dede;
  --color-rose-200: #f2c0c0;
  --color-rose-300: #e89696;
  --color-rose-400: #df6b6b;
  --color-rose-500: #d64545; /* brand: error */
  --color-rose-600: #be3232;
  --color-rose-700: #9e2828;
  --color-rose-800: #832525;
  --color-rose-900: #6e2424;
  --color-rose-950: #3b0e0e;

  /* ── Clay (neutral, warm) ─────────────────────────────── */
  --color-clay-50: #fbf4ed; /* brand: background */
  --color-clay-100: #f4eae0;
  --color-clay-200: #ece1d7; /* brand: border */
  --color-clay-300: #dbcbbc;
  --color-clay-400: #b8a595;
  --color-clay-500: #6b5d53; /* brand: text-muted */
  --color-clay-600: #574a42;
  --color-clay-700: #463b35;
  --color-clay-800: #38302b;
  --color-clay-900: #2c2521; /* brand: text */
  --color-clay-950: #1c1714;

  /* Friendlier default radius + body font (Inter is already loaded) */
  --radius-md: 0.625rem;
  --radius-lg: 0.875rem;
}

/* ── Nuxt UI design-token overrides ───────────────────────
   Map the app surfaces to the warm palette. Light first; dark inverts
   into the clay ramp so the app still feels warm, not clinical grey. */
:root {
  --ui-bg: var(--color-clay-50); /* page background  #FBF4ED */
  --ui-bg-muted: var(--color-clay-100);
  --ui-bg-elevated: #ffffff; /* cards/surfaces */
  --ui-bg-accented: var(--color-clay-200);
  --ui-border: var(--color-clay-200); /* #ECE1D7 */
  --ui-border-muted: var(--color-clay-100);
  --ui-text: var(--color-clay-900); /* #2C2521 */
  --ui-text-muted: var(--color-clay-500); /* #6B5D53 */
  --ui-text-dimmed: var(--color-clay-400);
  --ui-radius: var(--radius-md);
}

.dark {
  --ui-bg: var(--color-clay-950);
  --ui-bg-muted: var(--color-clay-900);
  --ui-bg-elevated: var(--color-clay-800);
  --ui-bg-accented: var(--color-clay-700);
  --ui-border: var(--color-clay-800);
  --ui-border-muted: var(--color-clay-900);
  --ui-text: var(--color-clay-50);
  --ui-text-muted: var(--color-clay-400);
  --ui-text-dimmed: var(--color-clay-500);
}

body {
  background: var(--ui-bg);
  color: var(--ui-text);
}
```

> If a token name above doesn't exist in the installed Nuxt UI version, check the
> generated tokens (`node_modules/@nuxt/ui`) and adapt — the _intent_ (warm cream
> bg, white cards, clay text, terracotta accents) is what matters. Verify by
> running the app and eyeballing a `UButton`/`UCard`/`UBadge` row.

---

## Deliverable 2 — `app/app.config.ts`

```ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'terracotta',
      secondary: 'sage',
      success: 'leaf',
      info: 'sage',
      warning: 'terracotta',
      error: 'rose',
      neutral: 'clay'
    }
  }
})
```

Also update the PWA/theme-color metadata so the installed app chrome matches the
brand (currently `#000000`):

- `nuxt.config.ts` → `app.head.meta` `theme-color` → `#FBF4ED`
- `nuxt.config.ts` → `pwa.manifest.background_color` / `theme_color` → `#FBF4ED`
- `pwa.manifest.description` → `"The marketplace for local-grown flowers"`

---

## Deliverable 3 — Typography

- **Body / UI:** Inter (already configured in `nuxt.config.ts` fonts).
- **Headings (recommended):** add a warm display serif for personality on
  profile names and section headers — **Fraunces** (or Lora). Add to the fonts
  config and expose as a `font-display` utility:
  ```css
  @theme {
    --font-display: 'Fraunces', ui-serif, Georgia, serif;
  }
  ```
  Use `class="font-display"` on the farm name, page hero titles, empty-state
  headings. Keep all functional/body text in Inter. If adding a font is out of
  scope for your task, ship with Inter and leave a TODO.

---

## UI building blocks & patterns (use these everywhere)

| Need                | Use                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Buttons             | `UButton` — `color="primary"` primary actions, `variant="soft"`/`"ghost"` secondary       |
| Inputs / forms      | `UForm` + `UFormField` + `UInput`/`UTextarea`/`USelectMenu` (built-in validation display) |
| Availability status | `UBadge` with the colour map from `shared/utils/flowers.ts` (doc 02)                      |
| Cards / list items  | `UCard` (elevated white surface)                                                          |
| Avatars             | `UAvatar` (grower avatar, fallback = initials)                                            |
| Modals / sheets     | `UModal` on desktop; **`UDrawer` (bottom sheet) on mobile** for add/edit                  |
| Toasts              | `useToast()` for save confirmations / errors                                              |
| Nav                 | custom bottom tab bar (doc 03) + `UNavigationMenu` where useful                           |
| Loading             | `USkeleton` for image/card placeholders                                                   |
| Empty states        | centered icon + `font-display` heading + one primary action                               |

### Visual rules

- Corners: `rounded-lg`/`rounded-xl` on cards and images. Photos are **square**
  (1:1) and `rounded-lg` — consistency is the whole point of the crop pipeline.
- Shadows: soft and low (`shadow-sm`), never harsh. Rely on the cream/white
  contrast for separation.
- Tap targets ≥ 44px. Primary actions reachable with a thumb (bottom of screen).
- Motion: subtle. Use Nuxt UI's built-in transitions; add gentle fade/slide on
  drawers and list inserts. No bounce.

---

## Definition of done

- [ ] `main.css` carries the full `@theme` + token overrides; app builds.
- [ ] `app.config.ts` maps all seven semantic aliases.
- [ ] A scratch page showing `UButton`/`UBadge`/`UCard`/`UInput` in each colour
      renders in-brand in **both** light and dark mode (screenshot in PR).
- [ ] PWA/theme-color metadata updated to the cream brand colour.
- [ ] `npm run typecheck && npm run lint` clean.
