import type { R2Bucket } from '@cloudflare/workers-types'
import { requireUser } from '~~/server/utils/requireUser'

/**
 * Authenticated image upload. Accepts a single, already-cropped image
 * (client-side square crop in <ImageUploader>) and stores it in the public
 * R2 bucket under `public/<uuid>.<ext>`. Returns the stored key; the caller
 * saves it on the relevant row (profile.avatarKey / flower_photo.r2Key).
 *
 * Body: either `multipart/form-data` with a `file` field, or a raw body with
 * `Content-Type: image/webp|image/jpeg|image/png`. The `/img` route enforces
 * the `public/` prefix so this is the only place objects are written.
 */

// Binding name matches the existing files proxy + wrangler.jsonc.
const R2_BINDING_NAME = 'FILES' as const

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB backstop (cropped client-side)

// content-type → file extension allowlist.
const EXT_BY_TYPE: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png'
}

export default defineEventHandler(async (event) => {
  await requireUser(event)

  const env = event.context.cloudflare?.env as Record<string, unknown> | undefined
  const r2 = env?.[R2_BINDING_NAME] as R2Bucket | undefined
  if (!r2) {
    throw createError({ statusCode: 500, statusMessage: `R2 binding ${R2_BINDING_NAME} missing` })
  }

  // ── Read the binary (multipart `file` field, else raw body) ───────────────
  let bytes: Uint8Array | undefined
  let contentType: string | undefined

  const reqType = getHeader(event, 'content-type') ?? ''
  if (reqType.startsWith('multipart/form-data')) {
    const form = await readMultipartFormData(event)
    const part = form?.find((p) => p.name === 'file')
    if (!part) {
      throw createError({ statusCode: 400, statusMessage: 'Missing file field' })
    }
    bytes = part.data
    contentType = part.type
  } else {
    const raw = await readRawBody(event, false)
    if (raw) bytes = new Uint8Array(raw)
    contentType = reqType
  }

  // ── Validate type ─────────────────────────────────────────────────────────
  const type = (contentType ?? '').split(';')[0]?.trim().toLowerCase() ?? ''
  const ext = EXT_BY_TYPE[type]
  if (!ext) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported image type (expected webp, jpeg, or png)'
    })
  }

  // ── Validate size ─────────────────────────────────────────────────────────
  if (!bytes || bytes.byteLength === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Empty upload' })
  }
  if (bytes.byteLength > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Image too large (max 5 MB)' })
  }

  // ── Store ─────────────────────────────────────────────────────────────────
  const key = `public/${crypto.randomUUID()}.${ext}`
  await r2.put(key, bytes, { httpMetadata: { contentType: type } })

  return { key }
})
