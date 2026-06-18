# 08 — PWA: Installable App + Manifest + Icons

Make the app installable on iOS / Android / desktop Chromium with one config block and a single source SVG. `@vite-pwa/nuxt` registers the service worker and serves the manifest; `@vite-pwa/assets-generator` turns one SVG into the full icon matrix.

---

## Install

```bash
npm i @vite-pwa/nuxt
npm i -D @vite-pwa/assets-generator
```

Script in `package.json`:

```json
"generate-pwa-assets": "pwa-assets-generator"
```

---

## Icon sources

Two SVGs in `public/`, hand-rolled:

| File                              | Purpose                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `public/App_icon_maskable.svg`    | **Generator input.** Full-bleed coloured background + your mark, scaled to fit inside Android's adaptive-icon safe zone (the inner ~80% of the canvas). |
| `public/App_icon_monochrome.svg`  | Transparent background, solid silhouette of your mark. Used for Android 13+ themed icons. Colour is irrelevant — Android tints opaque pixels.           |

The maskable SVG is the only image the generator processes. The monochrome SVG needs a one-line `sharp` invocation to render its PNGs (the generator has no monochrome preset).

For Android's adaptive-icon safe zone: scale your mark to **0.82 max** on a 24-unit viewBox. Above that, the parcel's farthest vertex starts to clip on circular masks. Wrap the mark in `<g transform="translate(12,12) scale(0.82) translate(-12,-12)">`.

---

## `pwa-assets.config.ts`

```ts
import { defineConfig } from '@vite-pwa/assets-generator/config'

const background = '#YOUR_BRAND_BG_HEX'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: {
      sizes: [64, 192, 512, 1024],
      favicons: [[48, 'favicon.ico']],
      padding: 0,
      resizeOptions: { background, fit: 'contain' }
    },
    maskable: {
      sizes: [512, 1024],
      padding: 0,
      resizeOptions: { background, fit: 'contain' }
    },
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { background, fit: 'contain' }
    }
  },
  images: ['public/App_icon_maskable.svg']
})
```

Outputs (all written to `public/`, all checked in):

- `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `pwa-1024x1024.png`
- `maskable-icon-512x512.png`, `maskable-icon-1024x1024.png`
- `apple-touch-icon-180x180.png`
- `favicon.ico`

Plus the monochrome PNGs (run separately):

```sh
node -e "const p=require('path'),s=require(p.resolve('node_modules/sharp'));
  for(const n of [512,1024])
    s('public/App_icon_monochrome.svg',{density:n}).resize(n,n).png()
     .toFile(\`public/monochrome-\${n}x\${n}.png\`)"
```

The 1024 sizes exist because Android upscales the **largest** available icon for the splash screen and dense launchers. A 512 source visibly softens on xxxhdpi devices. Flat-colour art makes 1024 PNGs tiny (~4 KB) — cheap insurance.

---

## `nuxt.config.ts`

Two blocks: head metadata and the `pwa` config.

### Head metadata

```ts
app: {
  head: {
    htmlAttrs: { lang: 'en' },
    meta: [
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: '{{APP_NAME}}' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'theme-color', content: '#YOUR_BRAND_BG_HEX' }
    ],
    link: [
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      { rel: 'icon', type: 'image/png', sizes: '64x64',   href: '/pwa-64x64.png' },
      { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/pwa-192x192.png' },
      { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/pwa-512x512.png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' }
    ]
  }
}
```

`viewport-fit=cover` lets you put content under the iOS notch / home indicator if needed.

### PWA block

```ts
pwa: {
  manifest: {
    name: '{{APP_NAME}}',
    short_name: '{{APP_NAME}}',
    description: 'Your app description',
    lang: 'en',
    background_color: '#YOUR_BRAND_BG_HEX',
    theme_color: '#YOUR_BRAND_BG_HEX',
    start_url: '/app',                           // where install lands; NOT '/'
    display: 'standalone',
    display_override: ['standalone'],
    icons: [
      { src: '/pwa-64x64.png',   sizes: '64x64',   type: 'image/png' },
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/pwa-1024x1024.png', sizes: '1024x1024', type: 'image/png' },
      { src: '/maskable-icon-512x512.png',  sizes: '512x512',  type: 'image/png', purpose: 'maskable' },
      { src: '/maskable-icon-1024x1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
      { src: '/monochrome-512x512.png',  sizes: '512x512',  type: 'image/png', purpose: 'monochrome' },
      { src: '/monochrome-1024x1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'monochrome' }
    ]
  },
  workbox: {
    navigateFallback: undefined,
    navigateFallbackDenylist: [/^\/api\//],      // API requests always go to network
    runtimeCaching: [
      {
        urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] }
        }
      },
      {
        urlPattern: ({ request }: { request: Request }) => request.destination === 'image',
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] }   // 0 covers opaque CORS
        }
      }
    ]
  },
  registerType: 'autoUpdate',
  devOptions: { enabled: false }
}
```

### Mount `<VitePwaManifest />`

This is the most-missed line. `@vite-pwa/nuxt` does **not** auto-inject `<link rel="manifest">`. It registers a `<VitePwaManifest />` component, but the link only reaches `<head>` if the component is rendered. Add it inside `<UApp>` (or the equivalent shell):

```vue
<!-- app/app.vue -->
<template>
  <UApp>
    <VitePwaManifest />
    <NuxtPage />
  </UApp>
</template>
```

Symptom if it's missing: Chrome DevTools → Application says "No manifest detected" even though `/manifest.webmanifest` returns 200.

---

## Why each setting

- **`start_url: '/app'`** — install lands users in the actual app, not the marketing home page.
- **`display: 'standalone'` + `display_override`** — installed app runs without browser chrome on iOS, Android, and desktop Chromium.
- **`background_color` matching the icon background** — the OS-rendered splash colour while the JS bundle warms up. Mismatched colours create a flash of contrast on launch.
- **`theme_color`** — the status bar tint.
- **`purpose: 'maskable'`** — tells Android the icon already accounts for the safe zone. Without this, Android crops the colour icon and inset-pads it on a white circle.
- **`purpose: 'monochrome'`** — Android 13+ themed icons. Without it the OS derives one from the colour icon and you get the "inset-on-tint" look.
- **`registerType: 'autoUpdate'`** — new SW activates on the next navigation. No prompt UI.
- **`navigateFallbackDenylist: [/^\/api\//]`** — API routes always go to the network. Never serve cached HTML for them.
- **Image `cacheableResponse.statuses: [0, 200]`** — `0` covers opaque CORS responses (e.g. third-party CDN images) so they get cached too.
- **`devOptions.enabled: false`** — avoids the "stale SW eating my HMR" problem in dev. PWA functionality only activates in production builds.

---

## Workflow when changing the icon

1. Edit the source SVGs.
2. Run `npm run generate-pwa-assets`.
3. Render the monochrome PNGs with the `node -e` one-liner (still no preset for it).
4. Verify corners visually:
   - Maskable PNGs: corners must be opaque (your brand colour).
   - Monochrome PNGs: corners must be transparent.
5. Commit the SVGs **and** the regenerated PNGs together.

---

## Verifying the build

```bash
npm run build
npm run preview
```

Chrome DevTools → **Application** tab:

- **Manifest** — parses cleanly with no errors.
- **Service Workers** — `sw.js` activated.
- The install icon appears in the omnibox.

On iOS, "Add to Home Screen" should pick up `apple-touch-icon-180x180.png` and the `apple-mobile-web-app-title`.

---

## Common failure modes

- **"White circle, shrunken icon, app named after the page title"** — all one root cause: Android could not read a usable manifest at install time. Fixes: ship a `<link rel="manifest">` (mount `<VitePwaManifest />`), include a `purpose: 'maskable'` icon, a `purpose: 'monochrome'` icon for Android 13+, and `background_color` matching the icon bg.
- **Cached old icons after re-publish** — installed manifests and icons are cached hard by the OS. Uninstall and re-install during testing.
- **`devOptions.enabled: true` in dev** — Vite HMR + a registered SW fight each other and serve stale modules. Keep it off; test SW behaviour via `npm run preview`.
- **Large files in the precache** — Workbox's default `globPatterns` includes everything in `.output/public/`. If you ship large assets (map archives, datasets), add them to `globIgnores: ['**/*.pmtiles']` so the SW doesn't try to precache hundreds of MB.

---

## Files to copy from `snippets/`

- `snippets/nuxt.config.ts` (PWA block included)
- `snippets/pwa-assets.config.ts`
- `snippets/public/App_icon_maskable.svg` (placeholder — replace with your art)
- `snippets/public/App_icon_monochrome.svg` (placeholder)
