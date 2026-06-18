# 06 — Image Pipeline (client square crop → public R2 → `/img`)

**Goal:** solve the photo-standardisation problem at source. Every flower photo
and avatar is cropped to a **consistent square** in the browser, compressed,
uploaded to a **public R2 bucket**, and served via a cached, public `/img`
route. Zero external image cost.

**Depends on:** 02 (keys live on `profile`/`flower_photo`). **Blocks:** 05, 07, 08.

This is a **shared dependency** — build it before profile (05) and flowers (07),
both of which upload images.

---

## Architecture

```
[browser] pick/take photo
   → crop to 1:1 + downscale (max 1280px) + encode WebP/JPEG (~quality 0.82)
   → POST binary to /api/uploads (auth required)
[worker] validate type/size → put to R2 under public/<uuid>.<ext>
   → return { key }
[store] key saved on profile.avatarKey / flower_photo.r2Key
[serve] GET /img/<key>  (PUBLIC, long cache)  → bytes from R2
```

Why client-side crop (the chosen approach): consistent squares with no
server-side image library, no per-image cost, full control. The crop UX is the
only cost and it's worth it — square photos are the product's visual signature.

---

## 1. Enable a public R2 bucket

In `wrangler.jsonc`, the example R2 block is commented out. Add a bucket binding
named `FILES`. Per repo convention, bindings are declared in the **top-level**
block (used by `nuxt dev`/Miniflare) **and inherited/overridden per env**
(`staging`, `production`). Follow the existing D1 pattern in the file.

```jsonc
"r2_buckets": [
  { "binding": "FILES", "bucket_name": "stems-files", "remote": true }
]
```

- Create the buckets: `wrangler r2 bucket create stems-files` (and
  `stems-files-staging` / `-production` matching your env naming).
- `remote: true` in dev makes Miniflare proxy the real bucket so dev and prod
  read the same objects (mirrors the repo's documented R2 approach).
- We serve images through our own `/img` route (below), so the bucket does **not**
  need public-internet access enabled — keep it private; the Worker reads it.

> ⚠️ The existing `server/api/files/[...path].get.ts` is an **auth-gated**
> streaming proxy with a `FILES` binding constant. Flower photos are **public**.
> Don't route public images through that handler. Add a separate public route
> (below). You may reuse its block-cache technique, but **without the auth gate**.

---

## 2. Upload endpoint — `server/api/uploads.post.ts`

Authenticated. Accepts a single already-cropped image and stores it.

- `requireUser(event)`.
- Read the binary: accept `multipart/form-data` (field `file`) **or** a raw body
  with `Content-Type: image/webp|image/jpeg|image/png`. Pick one and document it;
  multipart is simplest with `readMultipartFormData(event)`.
- **Validate**: content-type in an allowlist (`image/webp`, `image/jpeg`,
  `image/png`); byte length ≤ **5 MB** (cropped client-side, so this is a
  backstop) → `413` if over.
- Key: `public/${crypto.randomUUID()}.${ext}`. The `public/` prefix is the
  contract the `/img` route enforces.
- `await env.FILES.put(key, bytes, { httpMetadata: { contentType } })`.
- Return `{ key }`. The caller saves the key on the relevant row.

> Orphan cleanup: an uploaded key not yet attached to a row is harmless for V1.
> Optionally delete the old key when replacing an avatar/photo (see doc 05/07).
> A sweeper for orphans is V2 — note it, don't build it.

---

## 3. Public serve route — `server/routes/img/[...path].get.ts`

**Public, no auth.** Mirrors the storage prefix.

- Resolve `path` param → `r2Key = 'public/' + path` (or store full key incl.
  prefix and pass through). **Reject** anything that doesn't start with `public/`
  → `404`, so this route can never serve private objects.
- `const obj = await env.FILES.get(r2Key)`; `404` if missing.
- Stream back with:
  - `Content-Type` from `obj.httpMetadata?.contentType` (fallback `image/jpeg`).
  - `Cache-Control: public, max-age=31536000, immutable` (keys are content-unique
    UUIDs, so immutable is safe — replacing an image means a new key).
  - `ETag: obj.httpEtag`.
- Optional: put a response in `caches.default` via `waitUntil` for edge caching
  (guard for Miniflare like the existing proxy does). Range support is not needed
  for images — keep it simple (full-object GET).

### URL resolution helper — `server/utils/img.ts`
```ts
/** Turn a stored R2 key into a public URL the client can <img src> directly. */
export const imgUrl = (key?: string | null): string | null =>
  key ? `/img/${key.replace(/^public\//, '')}` : null
```
API handlers use `imgUrl()` to convert keys → URLs in DTOs (doc 02). The client
never sees raw keys.

---

## 4. Client crop + upload — `app/components/Image/ImageUploader.vue`

A reusable component used by avatar (doc 05) and flower photos (doc 07).

**Behaviour:**
- File input with `accept="image/*"` and `capture` allowed (so mobile offers the
  camera). Big tappable dropzone / "Add photo" button.
- On select → open a **square crop UI** (`UModal`/`UDrawer`). Let the user pan/zoom
  to frame a 1:1 crop.
- On confirm → draw to a `<canvas>` at the target square size (e.g. 1280×1280,
  smaller for avatars e.g. 512×512), `canvas.toBlob(..., 'image/webp', 0.82)`
  (fallback to `image/jpeg` if WebP encode unsupported).
- Upload the blob to `/api/uploads`; emit the returned `key` (and an immediate
  object-URL preview).
- Props: `aspect` (fixed 1:1 for V1), `maxSize` (1280 default), `shape`
  (`square` | `round` for avatar display). Emits `update:key` + `uploading`.

**Cropper library:** prefer a small, maintained Vue 3 cropper (e.g.
`vue-advanced-cropper`) **or** a hand-rolled canvas pan/zoom if you want zero
deps. Either is fine — call out the dependency in your PR. The hard requirement
is: **output is always a centered square**.

**UX:**
- Show a skeleton/spinner while uploading; disable save until done.
- Compress before upload — never ship a 12 MP original over mobile data.
- Graceful errors via `useToast()`.

---

## Definition of done
- [ ] `FILES` R2 bucket bound in `wrangler.jsonc` (top-level + per env); buckets created.
- [ ] `POST /api/uploads` validates type/size, stores under `public/<uuid>.<ext>`, returns key.
- [ ] `GET /img/<path>` serves public objects with immutable cache headers and
      refuses non-`public/` keys.
- [ ] `imgUrl()` helper used by DTO resolvers.
- [ ] `<ImageUploader>` produces a consistent square WebP/JPEG and returns a key;
      works with the device camera on mobile.
- [ ] Avatar (512²) and flower (1280²) presets both work.
- [ ] `npm run typecheck && npm run lint` clean.
