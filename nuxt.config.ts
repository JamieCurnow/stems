// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt', '@vite-pwa/nuxt'],

  devtools: { enabled: false },

  // Pre-bundle better-auth's deep entry points so Vite doesn't discover them at
  // runtime (which triggers a full page reload on first load in dev).
  vite: {
    optimizeDeps: {
      include: ['@better-auth/stripe/client', 'better-auth/client/plugins', 'better-auth/vue']
    }
  },

  css: ['~/assets/css/main.css'],

  // Locked to light mode — Stems is a warm, light-first brand. preference +
  // fallback both 'light' means the app never resolves to dark; there's no UI
  // toggle. To re-enable dark mode later, set preference back to 'system'.
  // @ts-expect-error provided by @nuxtjs/color-mode via @nuxt/ui
  colorMode: { preference: 'light', fallback: 'light', classSuffix: '' },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1.0, viewport-fit=cover'
        },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Stems' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'theme-color', content: '#FFFFFF' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '64x64',
          href: '/pwa-64x64.png'
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '192x192',
          href: '/pwa-192x192.png'
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '512x512',
          href: '/pwa-512x512.png'
        },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' }
      ]
    }
  },

  // Keep catalog markdown alongside source files without Nuxt auto-scanning them.
  ignore: ['**/*.md'],

  // Must be ≥ 2025-07-15. Below that, Nitro's cloudflareDev preset silently
  // falls back to a generic dev runtime that doesn't inject CF bindings.
  compatibilityDate: '2025-07-15',

  nitro: {
    preset: 'cloudflare-module',
    ignore: ['**/*.md'],
    imports: { dirs: ['!**/*.md'] },
    experimental: { wasm: false },
    cloudflare: {
      // wrangler.jsonc at the project root is the single source of truth.
      // Don't let Nitro generate dist/wrangler.json from inline options.
      deployConfig: false,
      nodeCompat: true
    }
  },

  typescript: {
    tsConfig: {
      compilerOptions: {},
      // `wrangler types` writes a gitignored worker-configuration.d.ts at the
      // project root with the full Cloudflare Workers ambient runtime types
      // (`declare function fetch`, workerd RequestInit, …). Nuxt's generated
      // tsconfig includes `../*.d.ts`, so without this exclude those globals
      // leak into the browser/app program and clobber the DOM + ofetch types
      // that $fetch<T>() depends on — every $fetch<T> then fails TS2558.
      // Server code is typed via server/types/cloudflare.d.ts plus explicit
      // @cloudflare/workers-types imports. Keep it out of the TS program.
      exclude: ['../worker-configuration.d.ts']
    }
  },

  fonts: {
    families: [
      {
        name: 'Inter',
        provider: 'google',
        weights: [400, 500, 600],
        styles: ['normal']
      },
      {
        // Classic, understated display serif (Toast-brand vibe) for the wordmark,
        // farm names, hero titles and empty-state headings — exposed via the
        // `font-display` utility (see main.css).
        name: 'EB Garamond',
        provider: 'google',
        weights: [400, 500, 600, 700],
        styles: ['normal', 'italic']
      }
    ],
    defaults: {
      weights: [400, 500, 600],
      styles: ['normal', 'italic'],
      subsets: ['latin-ext', 'latin']
    }
  },

  pwa: {
    manifest: {
      name: 'Stems',
      short_name: 'Stems',
      description: 'The marketplace for local-grown flowers',
      lang: 'en',
      background_color: '#FFFFFF',
      theme_color: '#FFFFFF',
      start_url: '/discover',
      display: 'standalone',
      display_override: ['standalone'],
      icons: [
        { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-1024x1024.png', sizes: '1024x1024', type: 'image/png' },
        {
          src: '/maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: '/maskable-icon-1024x1024.png',
          sizes: '1024x1024',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: '/monochrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'monochrome'
        },
        {
          src: '/monochrome-1024x1024.png',
          sizes: '1024x1024',
          type: 'image/png',
          purpose: 'monochrome'
        }
      ]
    },
    workbox: {
      navigateFallback: undefined,
      navigateFallbackDenylist: [/^\/api\//],
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
            cacheableResponse: { statuses: [0, 200] }
          }
        }
      ]
    },
    registerType: 'autoUpdate',
    devOptions: { enabled: false }
  }
})
