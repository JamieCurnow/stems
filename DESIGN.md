# Stems — Brand & Design Guidelines

The canonical reference for how Stems looks and feels. Read this before styling
any page or component so the app stays cohesive. The `/discover` page
(`app/pages/discover.vue` + `app/components/Grower/Card.vue`) is the reference
implementation — when in doubt, match it.

---

## North star

**Toast × Instagram.** Warm, understated, editorial, classy — calm and premium,
never loud or "marketplace-y". Picture the brand as a hip, mid-30s, surfy flower
grower who wears [Toast](https://www.toa.st) clothing: natural, considered,
unhurried, quietly confident.

- **Editorial, not corporate.** Generous whitespace, a characterful serif, restraint.
- **Content-forward, Instagram-like.** Avatar-led feeds, borderless rows, hairline
  dividers — the content is the interface, not the chrome.
- **One pop, used sparingly.** A single coral-peach accent does the colour work.
  The flowers themselves bring the rest.

### Explicit anti-patterns (learned from real rejections — do not reintroduce)

- ❌ **Shadowy / boxed cards.** No drop-shadowed content cards. Use borderless rows
  on hairline dividers. (Subtle elevation on _chrome_ like the nav pill or the
  search field is fine — that's not a content card.)
- ❌ **Cream / beige / warm-grey page backgrounds.** Rejected repeatedly as
  "browny", "creamy", "dark/muddy". The page canvas is **pure white**. Warmth
  comes from accents and the serif — never the background.
- ❌ **Orange.** The accent is a coral/rose-peach, not orange.
- ❌ **Fraunces** (or other wonky/quirky display serifs). Too characterful; the J
  was specifically disliked. Use the classic, restrained serif below.
- ❌ **Green as the lead accent.** Sage exists as a quiet semantic colour only.

---

## Colour

Defined in `app/assets/css/main.css` inside **`@theme static { … }`**. The
`static` keyword is **load-bearing** — see [Gotchas](#gotchas). Semantic aliases
are mapped in `app/app.config.ts`.

### Primary — Peach (coral, not orange)

The single pop: CTAs, active nav, links, the "● N in season" cue, focus rings.

| Token             | Hex       | Use                                  |
| ----------------- | --------- | ------------------------------------ |
| `peach-50`        | `#FEF5F3` | hero wash, soft fills                |
| `peach-100`       | `#FCE8E3` | avatar tint, soft button bg          |
| `peach-500`       | `#E87767` | **primary** — buttons, active, dots  |
| `peach-700`       | `#B6483B` | text on light peach                  |

Use peach with restraint. If a screen has more than a couple of peach elements,
it's probably too much.

### Neutral — Clay (warm greige; quiet, never the star)

Drives text, hairlines, muted UI. Warm enough to sit beside peach, light enough
to never read muddy.

| Token         | Hex       | Mapped to            | Use                          |
| ------------- | --------- | -------------------- | ---------------------------- |
| —             | `#FFFFFF` | `--ui-bg`            | **page background**          |
| `clay-100`    | `#F4F2ED` | `--ui-bg-muted`      | quiet fills                  |
| `clay-200`    | `#E9E5DE` | `--ui-border`        | **hairline dividers**        |
| `clay-500`    | `#847B6E` | `--ui-text-muted`    | handles, meta (warm taupe)   |
| `clay-900`    | `#211E1A` | `--ui-text`          | **ink** — headings, body     |

### Semantic (sparing, mostly off-brand-voice)

`secondary`/`info` = **sage**, `success` = **leaf**, `error` = **rose**,
`warning` = **terracotta**. These exist for status/feedback only — they don't
lead the visual identity. (`terracotta` is legacy from an earlier palette; kept
for `warning` but never used as primary.)

---

## Typography

Configured in `nuxt.config.ts` (`fonts`) and exposed in `main.css`.

- **Display — `EB Garamond`** (`font-display` / `--font-display`). Classic,
  understated, high-contrast serif. The Toast voice. Used for: the **Stems**
  wordmark, farm names, hero headlines, empty-state titles, drawer titles.
  Weights 400–700, with italics available.
- **Body / UI — `Inter`** (default sans). Handles, locations, meta, labels,
  buttons, search — anything functional.

Patterns:

- **Small-caps section labels:** `text-[11px] font-semibold uppercase
  tracking-[0.18em] text-muted` (e.g. "GROWERS NEAR YOU"). Tracked eyebrows over
  the hero use `tracking-[0.3em] text-primary`.
- Headings are `font-medium` (500) in EB Garamond — the serif carries weight; you
  rarely need bold.

---

## Layout language

The app shell is `app/layouts/app.vue`: a centred **`max-w-screen-sm` (640px)**
column with the floating bottom nav. **Every primary page uses it** — including
the public `/@handle` grower page — so navigation is consistent everywhere (the
tab bar handles the logged-out case: Discover + Sign in). `app/layouts/default.vue`
(a slim top bar, no tab bar) is reserved for focused entry flows — `login` and
`onboarding` — where a tab bar would be circular or let users escape the flow.
A narrow centred column on desktop is intentional (Instagram does the same) — do
not stretch content to fill wide viewports.

- **Borderless feed rows.** Lists are `divide-y divide-default`; each row sits
  directly on the page (no card box, no shadow). Avatar + text, generous `py-4`,
  a subtle hover tint and a hover-revealed `arrow-up-right` instead of a chevron.
- **Full-bleed headers.** A page header can break out to the full viewport while
  its text stays in the column: `mx-[calc(50%-50vw)] w-screen` on the section,
  `mx-auto max-w-screen-sm` on the inner content. `body { overflow-x: hidden }`
  (in `main.css`) keeps that from spawning a horizontal scrollbar.
- **Soft floral atmosphere.** `public/hero-flowers.svg` is a blurred-bokeh floral
  in the brand palette. Layer it under a bright white overlay
  (`from-white/45 … to-white`) so headers feel atmospheric but stay light. Keep
  it light — never dark/heavy.
- **Search field stands out.** A defined white pill: `bg-elevated`, `ring-1
  ring-default`, `shadow-sm`, `rounded-full`, with a `ring-primary` focus.
- **Nav: responsive.** Full-width bottom bar on mobile; a contained, centred,
  floating **pill** on desktop (`sm:w-fit sm:rounded-full sm:border sm:shadow-sm
  sm:mb-5`). See `app/components/App/TabBar.vue`.
- **Avatars without photos** get a deterministic warm tint keyed off the handle
  (peach / clay / honey), initials in `font-display`. Use the shared helpers
  `avatarTint(handle)` + `avatarInitials(name)` from `shared/utils/avatar.ts` so a
  grower looks identical across the feed, their public page and their account.
- **Availability is a stem count**, not a categorical status. `stemsAvailable`:
  `null` = "Available" (count unspecified), `0` = "Sold out", `>0` = "N stems
  available". Use `stemsLabel()` from `shared/utils/flowers.ts`. In-stock counts
  are the peach pop; sold-out rows dim to ~60%. The grower edits this inline on
  the manager (a number input) and in the add/edit form.
- **Empty states** are calm and box-free: a single icon, an EB Garamond line, a
  muted sub-line, an optional soft CTA — centred with lots of air. No dashed boxes.

### Shape & motion

- Radii: `--radius-md: 0.625rem`; pills (`rounded-full`) for search, buttons, nav.
  Buttons are pilled **globally** via `app.config.ts` (`ui.button.slots.base`) — you
  don't add `rounded-full` per-button. Quiet actions on a white page should be
  `variant="outline"` (a hairline pill), not `soft` (its near-white fill is
  invisible on white).
- Motion is subtle: `transition-colors`/`transition-all duration-200`, gentle
  hover lifts and arrow nudges. Nothing flashy.

---

## Applying this to a new page

1. Start from the white canvas; let content + one peach accent do the work.
2. Headings/marks in `font-display`; everything functional in Inter.
3. Lists → borderless rows + `divide-y divide-default`, not cards.
4. Need a banner? Full-bleed it with the floral SVG under a white overlay.
5. Reach for peach only on the primary action / active state / key cue.
6. Reuse `Grower/Card.vue`, the search pill, and the small-caps label patterns.

---

## Gotchas

- **`@theme static` is mandatory.** Nuxt UI maps semantic colours via
  `--ui-color-primary-500: var(--color-peach-500)`, an indirection Tailwind v4's
  class scanner can't see. Plain `@theme` tree-shakes away any shade not named by
  a literal utility class, so `--ui-primary` resolves to empty and **`bg-primary`
  renders transparent app-wide** (invisible primary buttons). `static` forces all
  shades to emit.
- **Layouts need `<NuxtLayout>`** wrapping `<NuxtPage />` in `app/app.vue`, or
  `definePageMeta({ layout })` is silently ignored (no shell, no tab bar, no column).
- **Adding/renaming a font family in `nuxt.config.ts` needs a dev-server restart**
  — `@nuxt/fonts` registers `@font-face` at startup; HMR won't pick it up.
- **Auth-dependent UI flashes** because the session resolves client-side (SSR has
  no cookie context). Gate logged-out-only UI on `!session.value.isPending &&
  !isAuthed` so it doesn't flash in for signed-in users on refresh.
