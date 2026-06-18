/**
 * Auth-gated R2 proxy with block-aligned edge caching. Serves Range requests
 * (206 Partial Content) without bypassing auth and without R2 round-trips
 * past the first fetch of each block.
 *
 * Caching strategy:
 *   Cloudflare's `caches.default` cannot store 206 Partial Content responses,
 *   so we can't cache the response itself. Instead we cache fixed-size 1 MiB
 *   blocks of the file as 200 responses, then assemble the blocks per-request
 *   to serve whatever Range the client asked for.
 *
 *   Cache lookups run AFTER the auth gate so unauthed users can never bypass
 *   auth. The version query param (`?v=<token>`) is part of the cache key,
 *   so cache-busting is just "use a new version token".
 *
 * Adapt `r2Key` resolution and the `R2_BINDING_NAME` constant to your bucket.
 */
import type { R2Bucket } from '@cloudflare/workers-types'

// Set to the binding name configured in wrangler.jsonc (e.g. "FILES").
const R2_BINDING_NAME = 'FILES' as const

// Restrict the URL → R2 key mapping to whatever shape you expect.
// Example: only `<slug>.<ext>` at the top level.
const PATH_RE = /^([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)$/

const CACHE_SECONDS = 60 * 60 * 24 * 30           // 30 days; cache-bust via `?v=`
const BLOCK_SIZE = 1024 * 1024                    // 1 MiB

interface BlockCtx {
  cache: Cache | undefined
  waitUntil: (p: Promise<unknown>) => void
  baseUrl: URL
  r2: R2Bucket
  r2Key: string
}

export default defineEventHandler(async (event) => {
  const env = event.context.cloudflare?.env as Record<string, unknown> | undefined
  const r2 = env?.[R2_BINDING_NAME] as R2Bucket | undefined
  if (!r2) {
    throw createError({ statusCode: 500, statusMessage: `R2 binding ${R2_BINDING_NAME} missing` })
  }

  // ── Auth gate ───────────────────────────────────────────────────────────
  const auth = serverAuth(event)
  const req = toWebRequest(event)
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  // ── Resolve path → R2 key ───────────────────────────────────────────────
  const raw = getRouterParam(event, 'path') ?? ''
  const path = raw.replace(/^\/+/, '')
  const match = path.match(PATH_RE)
  if (!match) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const r2Key = match[1]!

  // ── Cache context ───────────────────────────────────────────────────────
  // Workers expose `caches.default` but Miniflare in `nuxt dev` does not, so
  // guard the access — local dev just bypasses the edge cache.
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default
  const cfCtx = event.context.cloudflare?.context
  const waitUntil = cfCtx
    ? (p: Promise<unknown>) => cfCtx.waitUntil(p)
    : (_: Promise<unknown>) => {}

  // Strip per-request marker params so the cache key is stable across
  // block/meta variants of the same file.
  const baseUrl = new URL(req.url)
  baseUrl.searchParams.delete('__block')
  baseUrl.searchParams.delete('__meta')
  baseUrl.hash = ''

  const blockCtx: BlockCtx = { cache, waitUntil, baseUrl, r2, r2Key }

  // ── Parse Range header ──────────────────────────────────────────────────
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

  // ── Total file size (cached) ────────────────────────────────────────────
  const total = await getTotalSize(blockCtx)
  if (total === null) {
    throw createError({ statusCode: 404, statusMessage: `${r2Key} not found` })
  }
  if (rangeEnd === undefined) rangeEnd = total - 1
  rangeEnd = Math.min(rangeEnd, total - 1)
  if (rangeStart > rangeEnd) {
    throw createError({ statusCode: 416, statusMessage: 'Requested range not satisfiable' })
  }

  // ── Fetch the required blocks in parallel ───────────────────────────────
  const firstBlock = Math.floor(rangeStart / BLOCK_SIZE)
  const lastBlock = Math.floor(rangeEnd / BLOCK_SIZE)
  const blocks = await Promise.all(
    Array.from({ length: lastBlock - firstBlock + 1 }, (_, i) =>
      fetchBlock(blockCtx, firstBlock + i, total)
    )
  )

  // ── Slice + assemble ────────────────────────────────────────────────────
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

async function getTotalSize(ctx: BlockCtx): Promise<number | null> {
  const sizeUrl = new URL(ctx.baseUrl.toString())
  sizeUrl.searchParams.set('__meta', 'size')
  const sizeKey = new Request(sizeUrl.toString())

  if (ctx.cache) {
    const cached = await ctx.cache.match(sizeKey)
    if (cached) {
      const s = cached.headers.get('x-total-size')
      if (s) return Number(s)
    }
  }

  const head = await ctx.r2.head(ctx.r2Key)
  if (!head) return null
  const total = head.size

  if (ctx.cache) {
    const response = new Response(null, {
      status: 200,
      headers: {
        'x-total-size': String(total),
        'Cache-Control': `public, max-age=${CACHE_SECONDS}, immutable`
      }
    })
    ctx.waitUntil(ctx.cache.put(sizeKey, response))
  }
  return total
}

async function fetchBlock(ctx: BlockCtx, blockIndex: number, totalSize: number): Promise<ArrayBuffer> {
  const blockUrl = new URL(ctx.baseUrl.toString())
  blockUrl.searchParams.set('__block', String(blockIndex))
  const blockKey = new Request(blockUrl.toString())

  if (ctx.cache) {
    const cached = await ctx.cache.match(blockKey)
    if (cached) return await cached.arrayBuffer()
  }

  const offset = blockIndex * BLOCK_SIZE
  const length = Math.min(BLOCK_SIZE, totalSize - offset)
  const obj = await ctx.r2.get(ctx.r2Key, { range: { offset, length } })
  if (!obj) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const buf = await obj.arrayBuffer()

  if (ctx.cache) {
    const response = new Response(buf.slice(0), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(buf.byteLength),
        'Cache-Control': `public, max-age=${CACHE_SECONDS}, immutable`
      }
    })
    ctx.waitUntil(ctx.cache.put(blockKey, response))
  }

  return buf
}
