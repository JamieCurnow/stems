# Components

This file lists all components used in the app, what they do, and how to use them.

Components are auto-imported with a **directory prefix** (e.g. `app/components/Flower/Card.vue` → `<FlowerCard>`). Nuxt UI components (`U*`) and PWA components (`VitePwaManifest`) come from modules and aren't listed here.

---

## `<AppTabBar>`

Fixed bottom tab bar for the signed-in app shell (rendered by the `app` layout). A centred, **floating rounded pill** at every width (white/blur with a hairline border + soft shadow), lifted off the bottom edge (`mb-5` + safe-area). Items are horizontal segments: inactive tabs are icon-only circles (their label reveals left-to-right from behind the icon when active; labels always show from `sm`). The **active** tab is marked by a single soft-peach (`bg-peach-100`) pill that **slides** between tabs (position measured analytically since every active tab is the same fixed width; the slide transition is only active mid-change, so a resize snaps instantly). Thumb-reachable, 44px+ hit targets. Tabs adapt to auth + grower state: Discover is always shown; **Flowers** + the centre **Add** button are grower-only (gated on `useState('profile').isGrower`); **Profile** shows when signed in. Logged-out visitors instead get a prominent primary **Start selling** CTA (→ `/login`) in the bar — the catchiest spot to convert a passing flower seller into a signup.

### Props

None.

### Emits

- `add` — the centre `+` button was tapped. The `app` layout listens and navigates to `/flowers/new`.

### Example

```vue
<AppTabBar @add="onAdd" />
```

---

## `<FlowerCard>`

Shared flower row used by the grower's `/flowers` manager (`editable`) and read-only contexts. Borderless (Toast × Instagram language) — the parent list draws the hairline divider. Shows the availability status as a coloured `UBadge` (when set). In editable mode it shows the inline stems-available quick-edit (commits on blur/enter) and an overflow menu (Edit / Duplicate / Archive); the sold-out dim honours both an explicit `0` count and the `sold_out` status (`isSoldOut`).

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

Add / edit flower form. Renders **inline** on a dedicated page (`/flowers/new`, `/flowers/[id]/edit`) — no drawer/modal chrome of its own; the form is the page. Action row (Cancel / Save) is sticky to the bottom of the viewport. Prices are entered in pounds and converted to pence (`parsePounds`) on save; the bunch price auto-derives as a placeholder and is only persisted when explicitly overridden. Availability is two optional fields side by side — a status `USelect` (`AVAILABILITY_STATUSES`, with a "No status" clear option) and a numeric stems input. Photos are managed via `<ImageGalleryUploader>`; the full desired key set is sent as `photoKeys` (the server replaces the flower's photos).

### Props

- `flower`: `FlowerDto | null` (optional) — the flower to edit, or null/undefined to add. Seeded reactively, so it can arrive async (the edit page fetches it).

### Emits

- `saved`: `[flower: FlowerDto]` — emitted with the fresh DTO after a successful POST/PATCH. The page updates the cached list and navigates back.
- `cancel`: `[]` — Cancel pressed; the page navigates back.

### Example

```vue
<FlowerForm :flower="editing" @saved="onSaved" @cancel="navigateTo('/flowers')" />
```

---

## `<InvoiceForm>`

Create / edit invoice form. Renders **inline** on `/invoices/new` and `/invoices/[id]/edit` (sticky Cancel / Save action row, like `<FlowerForm>`). Money is entered in pounds and converted to pence (`parsePounds`) at the input boundary; **totals derive live** from the line items (`invoiceTotals`). Customer: a `USelectMenu` of saved contacts that fills the editable contact fields, or type a new one (saved to the reusable list on save unless opted out). Lines: blank rows plus a "Add from flowers" `USelectMenu` that prefills description + unit price from the grower's flower list (keeps `flowerId` as a soft link). VAT is a percent input next to the totals (→ basis points on save). Number is optional on create (placeholder shows the auto-generated preview).

### Props

- `invoice`: `InvoiceDto | null` (optional) — the invoice to edit; null/undefined to create. Seeded reactively (can arrive async).
- `settings`: `InvoiceSettingsDto` (required) — defaults (tax rate, payment terms, number preview).
- `customers`: `CustomerDto[]` (required) — saved contacts for the picker.
- `flowers`: `FlowerDto[]` (required) — the grower's flowers for the quick-add picker.

### Emits

- `saved`: `[invoice: InvoiceDto]` — fresh DTO after a successful POST/PATCH.
- `cancel`: `[]` — Cancel pressed.

### Example

```vue
<InvoiceForm :invoice="editing" :settings="settings" :customers="customers" :flowers="flowers" @saved="onSaved" @cancel="back" />
```

---

## `<InvoiceStatusBadge>`

Small status pill for invoices. Colour-codes `draft` (neutral) / `sent` (info) / `paid` (success), and shows an **"Overdue"** error tint when an unpaid invoice is past its `dueDate`.

### Props

- `status`: `InvoiceStatus` (required).
- `dueDate`: `number | null` (optional) — epoch ms; drives the overdue state.

### Example

```vue
<InvoiceStatusBadge :status="inv.status" :due-date="inv.dueDate" />
```

---

## `<FlowerGallery>`

Image gallery for the read-only single-flower page (a flower can carry several photos, cover first). Native CSS scroll-snap rail — no carousel library: `touch-action: pan-x` hands horizontal gestures to the browser (snap between photos) and lets vertical ones fall through to page scroll. Layers buyer-facing affordances over the rail — a frosted photo-count chip (`{current} / {total}`), frosted prev/next arrows (wrap around the ends), and tappable position dots. All of those are hidden for a single photo; a photo-less flower shows the flower-icon placeholder. (No thumbnail rail — the count chip + arrows already signal multiple photos.) Frame is `aspect-[4/5]` on mobile / `aspect-square` (`lg:`, where the single-listing page goes two-column) on desktop, rounded `24px`/`22px`. Key it by flower id so the rail resets to the cover per flower.

### Props

- `photos`: `string[]` (required) — resolved `/img` URLs, cover first. Empty → flower icon placeholder.
- `alt`: `string` (required) — alt text (the flower name).

### Example

```vue
<FlowerGallery :key="selected.id" :photos="selected.photoUrls" :alt="selected.name" />
```

---

## `<GrowerCard>`

One grower row in the discovery feed. Avatar-led, borderless, links the whole row to `/@handle`. Shows `@handle · location`, an "N in season" indicator (green `success` dot + label) when the grower has stock, and a relative last-active time. Photo-less growers get a deterministic warm tint + serif initials (`avatarTint` / `avatarInitials`).

### Props

- `grower`: `GrowerCardDto` (required) — from `GET /api/search`.

### Example

```vue
<GrowerCard v-for="g in data" :key="g.handle" :grower="g" />
```

---

## `<ShareButton>`

Share affordance for a grower's public page or a single flower listing. Uses the Web Share API on mobile, falling back to copy-to-clipboard + toast elsewhere. Builds an absolute `/@handle` URL by default; pass `flowerId` to share a specific flower's page (`/@handle/{flowerId}`), and `flowerName` so the share text names the flower.

### Props

- `handle`: `string` (required)
- `farmName`: `string` (required)
- `flowerId`: `string` — share this flower's page instead of the grower's shop.
- `flowerName`: `string` — flower name for the share title/text (used with `flowerId`).
- `variant` / `size` / `color`: `ButtonProps[...]` — passed through to `UButton`.
- `block`: `boolean` (default `false`)
- `label`: `string` (default `'Share'`)
- `square`: `boolean` (default `false`) — icon-only circular button (label kept for a11y).

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

## `<ContactPhoneInput>`

Two-part phone entry: a searchable dial-code picker (`USelectMenu`, defaults to `+44`) joined to a national-number `UInput` via `UFieldGroup`. v-models a single **E.164** string (`+447700900000`) so callers store/validate one canonical value — pairs with `normaliseWhatsapp` (`shared/utils/contact.ts`). Mask-only (no per-country rules); strips a leading national trunk zero so `07700…` under `+44` becomes `+447700…` rather than the broken `+4407700…`. Dial codes + the `splitE164` re-hydration helper live in `app/utils/phoneDialCodes.ts`.

### Props

- `defaultDialCode`: `string` (default `'+44'`) — seeds the picker when there's no value yet.
- `placeholder`: `string` (default `'Phone number'`) — national-number input placeholder.
- `disabled`: `boolean` (default `false`)
- `size`: `'sm' | 'md' | 'lg' | 'xl'` (default `'lg'`)

### Model / Emits

- `v-model` (default): `string` — the full E.164 number, or `''` when blank.
- `data`: `[{ isValid: boolean; dialCode: string; nationalNumber: string }]` — split parts + mask-only validity, for parents that want them.

### Example

```vue
<ContactPhoneInput v-model="state.whatsapp" placeholder="7700 900000" class="w-full" />
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

Headless crop-and-upload engine shared by `<ImageUploader>` and `<ImageGalleryUploader>`. Owns the file input, the framing modal (drag to reposition, slider to zoom), the canvas crop, WebP/JPEG encode, and the `POST /api/uploads`. Renders no preview chrome of its own — the parent calls `pick()` (exposed via `defineExpose`). The drag pan is clamped so the framed image always covers the frame (no exposed edge), re-clamping on zoom-out. Pass `multiple` to let one pick enqueue several photos — they're framed + uploaded one after another (cancel skips just that one).

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

Multi-photo crop-and-upload control. Manages an ordered list of R2 keys via the default v-model (cover = first). Drives `<ImageCropModal>` with `multiple`, so growers can pick several photos at once (each framed in turn); overflow past `max` is dropped cleanly. Growers can promote any photo to cover or remove individual photos.

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

## `<LandingPhoneMock>`

Presentational phone mockup for the marketing landing (`/`). A static illustration that mirrors the live grower page (`app/pages/@[handle]/index.vue`) 1:1 — banner, peach avatar with serif initials, contact pill, availability header, hairline-divided flower rows with placeholder gradient thumbnails, bottom scroll fade. **Never wired to live data**; the flower list is a local array and the `tint` gradients stand in for real photos. Self-contained: no props. Sizing scales up at `lg` (≥1024px) per the desktop handoff (272px device / 498px screen / 4 rows on mobile → 300px / 600px / 5 rows on desktop; the fifth row, Phlox, is `hidden lg:flex`). Rendered in both the mobile centrepiece and the desktop hero of `index.vue` — each parent gates visibility by breakpoint, so only the matching size ever shows.

### Example

```vue
<LandingPhoneMock />
```

---

## `<LandingInvoiceCard>`

Presentational invoice summary card for the marketing pages (`/` and `/how-it-works`). A static illustration of the printable invoice that mirrors the real invoice domain (`app/pages/invoices/[id]/`) — header with invoice number + status pill, "Billed to", hairline-divided line items (flower · stems → price, `tabular-nums`), a `border-top` total, and a flower-icon footer hint ("Pulled straight from your flower list"). **Never wired to live data.** Responsive: 330px / `rounded-[14px]` on mobile, 420px / `rounded-[16px]` from `lg`. All fields default to the standard mock content; override per prop if a page wants different example figures. Width/margins are positioning concerns left to the parent (pass via `class`).

### Props

All optional, defaulted to the mock content:

- `number`: `string` (default `'INV-0007'`)
- `status`: `string` (default `'Paid'`) — sage `success` pill.
- `billedTo`: `string` (default `'Mevagissey Flowers'`)
- `lines`: `{ name: string; qty: string; amount: string }[]` (default Cosmos / Sweet peas / Cornflower)
- `total`: `string` (default `'£65.00'`)

### Example

```vue
<LandingInvoiceCard class="mx-auto mt-7 lg:mx-0 lg:mt-0 lg:shrink-0" />
```

---

## Learnings

- **Directory prefix is the component name.** `Flower/Card.vue` is `<FlowerCard>`, `Image/CropModal.vue` is `<ImageCropModal>`, `Layout/CookieConsent.vue` is `<LayoutCookieConsent>`. Name new files with that in mind.
- **A `v-model` for an R2 key must be the _default_ model**, never `v-model:key`. `key` is consumed by Vue's renderer as the VNode key and never reaches the component, so two-way binding silently breaks. See `<ImageUploader>`.
- **Drawer-on-mobile / modal-on-desktop pattern.** `<ContactSheet>` starts as a `UDrawer` to match SSR, then switches to `UModal` once a `mounted` flag flips on `≥640px` — gating on `mounted` avoids a hydration mismatch (`useMediaQuery` is `false` during SSR). (`<FlowerForm>` previously used this too but is now a full inline page.)
- **Image inputs omit `capture`.** `<ImageCropModal>`'s file `<input>` has `accept="image/*"` but **no** `capture` attribute — `capture` forces the camera on mobile and blocks gallery selection. Leaving it off lets the OS offer both library and camera.
- **Object-URL ownership transfers on `uploaded`.** `<ImageCropModal>` hands the parent a local object URL for instant preview; the parent revokes it on remove/unmount.
- **Borderless feed language.** Cards (`<FlowerCard>`, `<GrowerCard>`) render as rows that sit directly on the page; the parent `<ul>`/`<div>` draws the `divide-y divide-default` hairlines. No card boxes or shadows — see `DESIGN.md`.
- **Buttons are pills app-wide** via `app.config.ts` (`ui.button.slots.base = 'rounded-full'`); don't add `rounded-full` per-button.
- **Drawers drag-to-close from anywhere**, not just the handle. Vaul's default `container` slot is `overflow-y-auto` — an inner scroll area that eats vertical touch drags everywhere except the handle (which sits outside it), the "reach for the top" jank. Set globally in `app.config.ts` (`ui.drawer.slots.container = 'overflow-y-visible'`): the whole short bottom-sheet becomes one draggable surface; taps still fire (vaul only drags past a movement threshold). A drawer that genuinely needs scrolling must override `ui.container` back to `overflow-y-auto`.
- **Swipeable gallery inside a draggable drawer.** `<FlowerGallery>` mixes a horizontal swipe (change photo) with the drawer's vertical drag (close) on one surface by using a native scroll-snap rail + `touch-action: pan-x` — the browser arbitrates the axes, no JS carousel fighting vaul for pointer capture.
- **Phone entry is split dial-code + national, bound as one E.164 string.** `<ContactPhoneInput>` keeps the country code in a separate picker so it's always explicit (the original `wa.me` bug was national numbers like `07123…` with no country code). It strips a leading trunk zero from the national part — right for the UK-first default (`+44`) but note it would also drop the kept-zero of trunk-retaining countries (e.g. Italy `+39 06…`); acceptable for a UK marketplace. The canonical-format guard still runs server-side via `normaliseWhatsapp`.
