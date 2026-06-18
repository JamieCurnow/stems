import { defineConfig } from '@vite-pwa/assets-generator/config'

/**
 * Replace `background` with your brand colour. The source SVG should already
 * paint a full-bleed background and scale the mark to ~80% (Android's
 * adaptive-icon safe zone), so every preset uses `padding: 0` — let the SVG
 * be the final image.
 *
 * Workflow:
 *   1. Edit public/App_icon_maskable.svg
 *   2. npm run generate-pwa-assets
 *   3. Render monochrome PNGs separately (see integration-guides/08-pwa-setup.md)
 *   4. Commit SVGs + regenerated PNGs together
 */

const background = '#000000'

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
