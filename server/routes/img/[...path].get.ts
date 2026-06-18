import type { R2Bucket } from '@cloudflare/workers-types'

/**
 * PUBLIC image serve route — no auth, works logged-out. Serves objects from
 * the public R2 bucket under the `public/` prefix with an immutable long
 * cache. Keys are content-unique UUIDs (replacing an image mints a new key),
 * so `immutable` is safe.
 *
 * Security: the route only ever reads keys under `public/`. The URL path is
 * mapped to `public/<path>`, and any attempt to escape that prefix (`..`,
 * leading slashes) is rejected — so this handler can never serve a private
 * object, even though it shares the bucket with the auth-gated proxy.
 *
 * Mirrors server/api/files/[...path].get.ts for binding access and the
 * Miniflare-guarded edge cache, but without the auth gate and Range logic.
 */

const R2_BINDING_NAME = 'FILES' as const

const CACHE_CONTROL = 'public, max-age=31536000, immutable' // 1 year

// Allow only safe key segments: word chars, dashes, dots, slashes — and
// never a `..` traversal segment.
const SAFE_PATH = /^[a-zA-Z0-9_\-./]+$/

export default defineEventHandler(async (event) => {
  const env = event.context.cloudflare?.env as Record<string, unknown> | undefined
  const r2 = env?.[R2_BINDING_NAME] as R2Bucket | undefined
  if (!r2) {
    throw createError({ statusCode: 500, statusMessage: `R2 binding ${R2_BINDING_NAME} missing` })
  }

  // ── Resolve path → R2 key (always under public/) ──────────────────────────
  const raw = getRouterParam(event, 'path') ?? ''
  const path = raw.replace(/^\/+/, '')
  if (!path || !SAFE_PATH.test(path) || path.includes('..')) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  const r2Key = `public/${path}`
  // Belt-and-braces: never serve anything outside the public prefix.
  if (!r2Key.startsWith('public/')) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  // ── Edge cache (guarded — Miniflare in `nuxt dev` has no caches.default) ───
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default
  const cfCtx = event.context.cloudflare?.context
  const waitUntil = cfCtx ? (p: Promise<unknown>) => cfCtx.waitUntil(p) : () => {}

  const req = toWebRequest(event)
  if (cache) {
    const hit = await cache.match(req)
    if (hit) return hit
  }

  // ── Fetch from R2 ─────────────────────────────────────────────────────────
  const obj = await r2.get(r2Key)
  if (!obj) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const headers = new Headers({
    'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg',
    'Cache-Control': CACHE_CONTROL,
    ETag: obj.httpEtag
  })

  const buf = await obj.arrayBuffer()
  const response = new Response(buf, { status: 200, headers })
  if (cache) waitUntil(cache.put(req, response.clone()))
  return response
})
