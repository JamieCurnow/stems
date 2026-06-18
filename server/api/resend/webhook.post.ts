import { useDb } from '~~/server/utils/db'
import * as schema from '~~/server/db/schema'

/**
 * Resend webhook endpoint. Listens for `email.bounced` and `email.complained`
 * and writes the recipient address into `emailSuppression` so future sends
 * are blocked at the audience check.
 *
 * Configure in Resend dashboard pointing at:
 *   https://stems.market/api/resend/webhook
 *
 * Signature verification: Resend signs webhooks with the Svix scheme
 * (`svix-id`, `svix-timestamp`, `svix-signature` headers). When
 * RESEND_WEBHOOK_SECRET is set we verify the HMAC-SHA256 signature over
 * `${id}.${timestamp}.${rawBody}` and enforce a timestamp window to block
 * replays — an unverified caller cannot poison the suppression list (which
 * gates *all* sends, including magic-link sign-in). When the secret is unset
 * (local dev) verification is skipped so `stripe`-style CLI forwarding / curl
 * still works.
 */
interface ResendEvent {
  type?: string
  data?: { email?: { to?: string | string[]; from?: string }; to?: string | string[] }
}

const extractRecipient = (e: ResendEvent): string | null => {
  const candidates = [e.data?.email?.to, e.data?.to]
  for (const c of candidates) {
    if (typeof c === 'string') return c.toLowerCase()
    if (Array.isArray(c) && typeof c[0] === 'string') return c[0].toLowerCase()
  }
  return null
}

// Reject timestamps more than 5 minutes from now (Svix's default tolerance).
const SVIX_TOLERANCE_SECONDS = 5 * 60

const base64ToArrayBuffer = (b64: string): ArrayBuffer => {
  const bin = atob(b64)
  const buf = new ArrayBuffer(bin.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i)
  return buf
}

// Constant-time string compare — avoids leaking the signature via timing.
const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

const verifySvixSignature = async (opts: {
  secret: string
  id: string
  timestamp: string
  body: string
  signatureHeader: string
}): Promise<boolean> => {
  const ts = Number(opts.timestamp)
  if (!Number.isFinite(ts)) return false
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > SVIX_TOLERANCE_SECONDS) return false

  // The secret is `whsec_<base64>` — the bytes after the prefix are the key.
  const keyB64 = opts.secret.startsWith('whsec_') ? opts.secret.slice(6) : opts.secret
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(keyB64),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signed = `${opts.id}.${opts.timestamp}.${opts.body}`
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed))
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)))

  // Header is a space-separated list of `<version>,<base64sig>` — accept if
  // any v1 entry matches (Svix rotates by appending, not replacing).
  return opts.signatureHeader
    .split(' ')
    .map((part) => part.split(','))
    .some(([version, sig]) => version === 'v1' && !!sig && timingSafeEqual(sig, expected))
}

export default defineEventHandler(async (event) => {
  const env = event.context.cloudflare?.env
  const secret = env?.RESEND_WEBHOOK_SECRET
  const rawBody = (await readRawBody(event)) ?? ''

  if (secret) {
    const id = getHeader(event, 'svix-id')
    const timestamp = getHeader(event, 'svix-timestamp')
    const signature = getHeader(event, 'svix-signature')
    if (!id || !timestamp || !signature) {
      throw createError({ statusCode: 401, statusMessage: 'Missing signature headers' })
    }
    const ok = await verifySvixSignature({ secret, id, timestamp, body: rawBody, signatureHeader: signature })
    if (!ok) throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })
  }

  let body: ResendEvent
  try {
    body = rawBody ? (JSON.parse(rawBody) as ResendEvent) : {}
  } catch {
    return { received: true, ignored: 'invalid-json' }
  }
  if (!body?.type) return { received: true, ignored: 'no-type' }

  const interesting = body.type === 'email.bounced' || body.type === 'email.complained'
  if (!interesting) return { received: true, ignored: body.type }

  const recipient = extractRecipient(body)
  if (!recipient) return { received: true, ignored: 'no-recipient' }

  const reason = body.type === 'email.complained' ? 'complaint' : 'hard_bounce'
  const db = useDb(event)
  await db
    .insert(schema.emailSuppression)
    .values({ email: recipient, reason, createdAt: new Date() })
    .onConflictDoNothing()

  return { received: true, suppressed: recipient }
})
