# Components

This file lists all components used in the app, what they do, and how to use them.

Components are auto-imported with a **directory prefix** (e.g. `app/components/Flower/Card.vue` → `<FlowerCard>`). Nuxt UI components (`U*`) and PWA components (`VitePwaManifest`) come from modules and aren't listed here.

---

## `<AppTabBar>`

Fixed bottom tab bar for the signed-in app shell (rendered by the `app` layout). Thumb-reachable, safe-area padded. Tabs adapt to auth + grower state: Discover is always shown; **My Flowers** + the centre **Add** button are grower-only (gated on `useState('profile').isGrower`); the third tab is **Profile** when signed in, **Sign in** otherwise.

### Props

None.

### Emits

- `add` — the centre `+` button was tapped. The `app` layout listens and navigates to `/flowers?add=1`.

### Example

```vue
<AppTabBar @add="onAdd" />
```

---

## `<FlowerCard>`

Shared flower row used by the grower's `/flowers` manager (`editable`) and read-only contexts. Borderless (Toast × Instagram language) — the parent list draws the hairline divider. In editable mode it shows the inline stems-available quick-edit (commits on blur/enter) and an overflow menu (Edit / Duplicate / Archive).

### Props

- `flower`: `FlowerDto` (required) — the flower to render.
- `editable`: `boolean` (default `false`) — show the inline stock edit + overflow menu.

### Emits (only meaningful when `editable`)

- `change-stems`: `[id: string, stems: number | null]` — `null` = "Available", `0` = sold out, `n` = count.
- `edit`: `[flower: FlowerDto]`
- `duplicate`: `[flower: FlowerDto]`
- `archive`: `[flower: FlowerDto]`

### Example

```vue
<FlowerCard
  :flower="f"
  editable
  @change-stems="changeStems"
  @edit="openEdit"
  @duplicate="duplicate"
  @archive="archive"
/>
```

---

## `<FlowerForm>`

Add / edit flower form. Renders inside a `UDrawer` (bottom sheet) on mobile and a `UModal` on desktop (SSR-safe breakpoint switch via a mounted flag). Prices are entered in pounds and converted to pence (`parsePounds`) on save; the bunch price auto-derives as a placeholder and is only persisted when explicitly overridden. Photos are managed via `<ImageGalleryUploader>`; the full desired key set is sent as `photoKeys` (the server replaces the flower's photos).

### Props

- `flower`: `FlowerDto | null` (optional) — the flower to edit, or null/undefined to add.

### Model / Emits

- `v-model:open`: `boolean` — drawer/modal open state (owned by the parent).
- `saved`: `[flower: FlowerDto]` — emitted with the fresh DTO after a successful POST/PATCH.

### Example

```vue
<FlowerForm v-model:open="formOpen" :flower="editing" @saved="onSaved" />
```

---

## `<GrowerCard>`

One grower row in the discovery feed. Avatar-led, borderless, links the whole row to `/@handle`. Shows `@handle · location`, an "N in season" pill when the grower has stock, and a relative last-active time. Photo-less growers get a deterministic warm tint + serif initials (`avatarTint` / `avatarInitials`).

### Props

- `grower`: `GrowerCardDto` (required) — from `GET /api/search`.

### Example

```vue
<GrowerCard v-for="g in data" :key="g.handle" :grower="g" />
```

---

## `<ShareButton>`

Share affordance for a grower's public page. Uses the Web Share API on mobile, falling back to copy-to-clipboard + toast elsewhere. Builds an absolute `/@handle` URL.

### Props

- `handle`: `string` (required)
- `farmName`: `string` (required)
- `variant` / `size` / `color`: `ButtonProps[...]` — passed through to `UButton`.
- `block`: `boolean` (default `false`)
- `label`: `string` (default `'Share'`)

### Example

```vue
<ShareButton :handle="profile.handle" :farm-name="profile.farmName" block variant="outline" />
```

---

## `<ContactSheet>`

"Contact the grower" sheet. Lists the contact methods the grower has filled in (`contactOptions`) and deep-links to the buyer's native app (WhatsApp / mail / Instagram) — Stems has **no in-app messaging**. `UDrawer` on mobile, `UModal` on desktop.

### Props

- `profile`: `PublicProfileDto` (required)

### Model

- `v-model:open`: `boolean`

### Example

```vue
<ContactSheet v-if="hasContact" v-model:open="contactOpen" :profile="profile" />
```

---

## `<ImageUploader>`

Single-photo crop-and-upload control (avatars, banners). Owns the preview/dropzone chrome and the stored R2 key (via the **default** v-model — `key` is a Vue-reserved attribute, so it must be the default model, not `v-model:key`). The crop+upload engine is `<ImageCropModal>`.

### Props

- `maxSize`: `number` (default `1280`) — longest output edge in px.
- `aspect`: `number` (default `1`) — crop width / height.
- `shape`: `'square' | 'round'` (default `'square'`) — preview chrome only.
- `label`: `string` (default `'Add photo'`)

### Model / Emits

- `v-model` (default): `string | null` — the stored R2 key.
- `uploading`: `[boolean]` — true while encoding/uploading.

### Example

```vue
<ImageUploader v-model="avatarKey" :max-size="512" shape="round" @uploading="uploading = $event" />
```

---

## `<ImageCropModal>`

Headless crop-and-upload engine shared by `<ImageUploader>` and `<ImageGalleryUploader>`. Owns the file input, the framing modal (drag to reposition, slider to zoom), the canvas crop, WebP/JPEG encode, and the `POST /api/uploads`. Renders no preview chrome of its own — the parent calls `pick()` (exposed via `defineExpose`).

### Props

- `maxSize`: `number` (default `1280`)
- `aspect`: `number` (default `1`)

### Emits

- `uploaded`: `[{ key: string; url: string }]` — stored R2 key + a local object URL for instant preview. **The parent owns `url` and must revoke it.**
- `uploading`: `[boolean]`

### Example

```vue
<ImageCropModal ref="crop" :max-size="1280" @uploaded="onUploaded" @uploading="uploading = $event" />
<!-- crop.value?.pick() to start a flow -->
```

---

## `<ImageGalleryUploader>`

Multi-photo crop-and-upload control. Manages an ordered list of R2 keys via the default v-model (cover = first). Each added photo runs through `<ImageCropModal>`; growers can promote any photo to cover or remove individual photos.

### Props

- `maxSize`: `number` (default `1280`)
- `max`: `number` (default `8`) — maximum photos.

### Model / Emits

- `v-model` (default): `string[]` — ordered R2 keys, cover first.
- `uploading`: `[boolean]`

### Example

```vue
<ImageGalleryUploader v-model="state.photoKeys" :max-size="1280" :max="8" @uploading="uploading = $event" />
```

---

## `<LayoutCookieConsent>`

Consent banner shown until the user makes a choice (`useConsent().decided`). Offers Accept all / Reject non-essential / Manage. Rendered globally from `app.vue`. Opens `<LayoutConsentManageDialog>` for granular control.

### Props

None.

---

## `<LayoutConsentManageDialog>`

Granular cookie-preferences modal (Strictly functional [always on] / Analytics / Marketing). Re-seeds its switches from the stored choice each time it opens; saving writes via `useConsent().set`.

### Model

- `v-model:open`: `boolean`

---

## Learnings

- **Directory prefix is the component name.** `Flower/Card.vue` is `<FlowerCard>`, `Image/CropModal.vue` is `<ImageCropModal>`, `Layout/CookieConsent.vue` is `<LayoutCookieConsent>`. Name new files with that in mind.
- **A `v-model` for an R2 key must be the _default_ model**, never `v-model:key`. `key` is consumed by Vue's renderer as the VNode key and never reaches the component, so two-way binding silently breaks. See `<ImageUploader>`.
- **Drawer-on-mobile / modal-on-desktop pattern.** `<FlowerForm>` and `<ContactSheet>` start as a `UDrawer` to match SSR, then switch to `UModal` once a `mounted` flag flips on `≥640px` — gating on `mounted` avoids a hydration mismatch (`useMediaQuery` is `false` during SSR).
- **Object-URL ownership transfers on `uploaded`.** `<ImageCropModal>` hands the parent a local object URL for instant preview; the parent revokes it on remove/unmount.
- **Borderless feed language.** Cards (`<FlowerCard>`, `<GrowerCard>`) render as rows that sit directly on the page; the parent `<ul>`/`<div>` draws the `divide-y divide-default` hairlines. No card boxes or shadows — see `DESIGN.md`.
- **Buttons are pills app-wide** via `app.config.ts` (`ui.button.slots.base = 'rounded-full'`); don't add `rounded-full` per-button.
