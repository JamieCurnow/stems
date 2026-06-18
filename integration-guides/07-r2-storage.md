# 07 — R2: Auth-Gated Storage with Block Caching

R2 is Cloudflare's S3-compatible object storage. Zero egress fees, billed per GB stored + per million operations. Bound directly into the Worker — you call `env.BUCKET.get(key)` and get an `R2ObjectBody`.

This guide covers two patterns:

1. **Open public assets** — bucket attached to a public Cloudflare R2 custom domain. Nothing to do server-side; clients hit `https://files.{{APP_DOMAIN}}/<key>` directly.
2. **Auth-gated proxy with edge caching** — what to do when every byte served needs the auth check to run first. This is the interesting pattern.

---

## Binding

`wrangler.jsonc`:

```jsonc
"r2_buckets": [
  {
    "binding": "FILES",
    "bucket_name": "{{APP_SLUG}}-files",
    "remote": true                  // ← dev-only flag, see below
  }
],
"env": {
  "staging": {
    "r2_buckets": [{ "binding": "FILES", "bucket_name": "{{APP_SLUG}}-files" }]
    // Note: no `remote: true` in deployed envs
  },
  "production": {
    "r2_buckets": [{ "binding": "FILES", "bucket_name": "{{APP_SLUG}}-files" }]
  }
}
```

In the top-level (dev) block, `"remote": true` tells Miniflare to proxy this binding straight to the real R2 bucket instead of standing up a per-machine empty stub. So `npm run dev` reads/writes the same bucket your production worker uses — no sync step. The flag is **dev-only**; deployed envs reject it.

This is a deliberate convenience choice. Trade-off: dev writes mutate prod state. For most read-mostly buckets it's the right trade. If you store mutable user data, set up a separate dev bucket and drop `remote: true`.

Create the bucket once with wrangler:

```bash
wrangler r2 bucket create {{APP_SLUG}}-files
```

Upload via the CLI or the dashboard. For programmatic uploads, use the `S3 API` credentials from the R2 dashboard with any S3 SDK.

---

## Pattern 1: Open public assets

Skip the proxy entirely. In R2 dashboard → your bucket → Settings → Public access → connect a custom domain (e.g. `files.{{APP_DOMAIN}}`). Cloudflare adds the DNS record and you're done.

Use it from the client:

```html
<img src="https://files.{{APP_DOMAIN}}/logos/main.png">
```

CDN caching is automatic. Range requests work. Free egress.

---

## Pattern 2: Auth-gated proxy

For private files, every byte should be served only to authenticated users. Three asks:

1. Run the auth check before serving anything.
2. Serve `Range` requests properly (clients depend on `206 Partial Content` for big files).
3. Cache aggressively without bypassing auth.

The naive approach — `caches.default.put(req, response)` on the full response — has a problem: Cloudflare's edge cache cannot store `206 Partial Content`. If you do nothing, every Range request goes to R2.

The fix is **block-aligned caching**: split the file into 1 MiB blocks, cache each block as a 200 response, and assemble blocks per-request to serve whatever Range the client asked for.

### Sketch

```ts
import type { R2Bucket } from '@cloudflare/workers-types'

const BLOCK_SIZE = 1024 * 1024                // 1 MiB
const CACHE_SECONDS = 60 * 60 * 24 * 30       // 30 days; cache-bust with ?v= query

export default defineEventHandler(async (event) => {
  const env = event.context.cloudflare?.env
  if (!env?.FILES) {
    throw createError({ statusCode: 500, statusMessage: 'R2 binding missing' })
  }

  // 1. Auth gate
  const auth = serverAuth(event)
  const req = toWebRequest(event)
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  // 2. Resolve the R2 key from the path
  // NOTE: the shipped proxy (server/api/files/[...path].get.ts) validates the
  // path against `PATH_RE = /^([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)$/` — i.e. flat
  // `<name>.<ext>` keys only, no slashes. If you store nested keys (see the
  // upload example below, `users/<id>/<uuid>.bin`), relax that regex to allow
  // `/` or the read proxy will 404 them.
  const path = (getRouterParam(event, 'path') ?? '').replace(/^\/+/, '')
  const r2Key = path

  // 3. Cache context (Miniflare in dev doesn't expose caches.default — guard it)
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default
  const cfCtx = event.context.cloudflare?.context
  const waitUntil = cfCtx ? (p: Promise<unknown>) => cfCtx.waitUntil(p) : () => {}
  const baseUrl = new URL(req.url)
  baseUrl.searchParams.delete('__block')
  baseUrl.searchParams.delete('__meta')

  // 4. Parse Range header (optional)
  let rangeStart = 0
  let rangeEnd: number | undefined
  const rangeHeader = req.headers.get('range')
  if (rangeHeader) {
    const m = rangeHeader.match(/^bytes=(\d+)-(\d*)$/)
    if (m) {
      rangeStart = Number(m[1])
      if (m[2]) rangeEnd = Number(m[2])
    }
  }

  // 5. Cached size lookup
  const total = await getTotalSize({ cache, waitUntil, baseUrl, r2: env.FILES, r2Key })
  if (total === null) throw createError({ statusCode: 404 })
  if (rangeEnd === undefined) rangeEnd = total - 1
  rangeEnd = Math.min(rangeEnd, total - 1)
  if (rangeStart > rangeEnd) throw createError({ statusCode: 416 })

  // 6. Fetch the blocks that cover [rangeStart, rangeEnd]
  const firstBlock = Math.floor(rangeStart / BLOCK_SIZE)
  const lastBlock = Math.floor(rangeEnd / BLOCK_SIZE)
  const blocks = await Promise.all(
    Array.from({ length: lastBlock - firstBlock + 1 }, (_, i) =>
      fetchBlock({ cache, waitUntil, baseUrl, r2: env.FILES, r2Key }, firstBlock + i, total)
    )
  )

  // 7. Slice + assemble
  const totalLength = rangeEnd - rangeStart + 1
  const result = new Uint8Array(totalLength)
  let writePos = 0
  for (let i = 0; i < blocks.length; i++) {
    const blockIndex = firstBlock + i
    const blockStart = blockIndex * BLOCK_SIZE
    const data = new Uint8Array(blocks[i]!)
    const sliceFrom = Math.max(rangeStart, blockStart) - blockStart
    const sliceTo = Math.min(rangeEnd + 1, blockStart + data.byteLength) - blockStart
    const slice = data.subarray(sliceFrom, sliceTo)
    result.set(slice, writePos)
    writePos += slice.length
  }

  // 8. Build the response
  const headers = new Headers({
    'Content-Type': 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': `public, max-age=${CACHE_SECONDS}, immutable`,
    'Content-Length': String(totalLength)
  })
  if (rangeHeader) {
    headers.set('Content-Range', `bytes ${rangeStart}-${rangeEnd}/${total}`)
    return new Response(result, { status: 206, headers })
  }
  return new Response(result, { status: 200, headers })
})
```

The helpers `getTotalSize` and `fetchBlock` use synthetic cache keys with query parameters (`?__meta=size`, `?__block=42`) so each block is its own cacheable entity:

```ts
async function fetchBlock(ctx, blockIndex, total) {
  const blockUrl = new URL(ctx.baseUrl.toString())
  blockUrl.searchParams.set('__block', String(blockIndex))
  const cacheKey = new Request(blockUrl.toString())

  if (ctx.cache) {
    const cached = await ctx.cache.match(cacheKey)
    if (cached) return await cached.arrayBuffer()
  }

  const offset = blockIndex * BLOCK_SIZE
  const length = Math.min(BLOCK_SIZE, total - offset)
  const obj = await ctx.r2.get(ctx.r2Key, { range: { offset, length } })
  if (!obj) throw createError({ statusCode: 404 })
  const buf = await obj.arrayBuffer()

  if (ctx.cache) {
    const cached = new Response(buf.slice(0), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(buf.byteLength),
        'Cache-Control': `public, max-age=${CACHE_SECONDS}, immutable`
      }
    })
    ctx.waitUntil(ctx.cache.put(cacheKey, cached))
  }
  return buf
}
```

See `snippets/server/api/files/[...path].get.ts` for the production-ready version.

### Properties

- **Auth runs first.** Cache lookup happens after the gate — an unauthed user can never even reach the cache layer.
- **Range requests work.** The client sees `206 Partial Content` with the right `Content-Range` header.
- **Cache hits on the second range request to the same block.** Cloudflare's POP cache stores the 1 MiB block; subsequent requests touching the same block hit the cache.
- **Cache-bust via query param.** Append `?v=<version-token>` to the request URL when the file changes. The cache key includes the search params, so a new version starts with an empty keyspace.

### When to use this pattern

- Auth-gated large files (PDFs, videos, archives, map tiles, datasets).
- Anywhere clients use Range requests (PMTiles, MBtiles, audio scrubbing, video).
- Any time signed URLs feel awkward — e.g. when one logical "open" generates many small Range requests.

---

## Pattern 3: Signed URLs (the alternative)

Cloudflare R2 also supports presigned S3-style URLs via the S3 API. Cleaner for one-shot downloads. Less attractive when:

- The asset is range-requested many times per "open" (you'd sign each range).
- You want centralised auth + observability — the proxy logs every byte served.
- You want fine-grained authorization (e.g. "user can only read files in their tenant").

For "download this PDF once" — use signed URLs. For "stream this dataset via Range requests" — use the proxy.

---

## Pattern 4: Uploads

R2 accepts `PUT` directly from the Worker. For user uploads:

```ts
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const env = event.context.cloudflare?.env
  if (!env?.FILES) throw createError({ statusCode: 500 })

  const body = await readRawBody(event, false)
  if (!body) throw createError({ statusCode: 400 })

  const key = `users/${user.id}/${crypto.randomUUID()}.bin`
  await env.FILES.put(key, body, {
    httpMetadata: {
      contentType: getHeader(event, 'content-type') ?? 'application/octet-stream'
    }
  })

  return { key }
})
```

For large uploads, prefer the S3 multipart API from the client (Cloudflare R2 supports it natively) so the Worker isn't holding the bytes in memory. The Worker request body size is capped at 100 MB; clients with larger uploads should hit R2's S3 endpoint directly with a presigned URL.

---

## Local dev considerations

- **`remote: true`** on the dev binding proxies to the real R2 bucket. Use this for read-mostly buckets.
- **No `remote` flag** means Miniflare creates a local R2 stub that starts empty. Useful for mutable user-data buckets, but you'll need to populate it manually.
- **`caches.default` is undefined in Miniflare.** The proxy code above guards for this — local dev just bypasses the edge cache (slower, but correct).

---

## Files to copy from `snippets/`

- `snippets/server/api/files/[...path].get.ts` (the auth-gated proxy pattern)
- `wrangler.jsonc` (already covered in 01 — just add the `r2_buckets` block)
