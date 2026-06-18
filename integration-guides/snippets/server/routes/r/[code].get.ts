import { REFERRAL_COOKIE } from '~~/shared/utils/constants'
import { sendServerEvent } from '~~/server/utils/analytics'

const VALID_CODE = /^[A-Z0-9]{2,8}-[A-Z0-9]{2,8}$/

/**
 * Public landing redirect. `https://stems.market/r/JANE-X4F2` drops a
 * 30-day cookie carrying the code, then bounces to /login?ref=CODE so the
 * code follows the user through Checkout.
 *
 * Lives in server/routes/ (public, no auth) — Nitro maps routes/* to the
 * URL root.
 */
export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'code') ?? ''
  const code = raw.toUpperCase()
  const valid = VALID_CODE.test(code)

  if (valid) {
    setCookie(event, REFERRAL_COOKIE, code, {
      maxAge: 60 * 60 * 24 * 30,                   // 30 days
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      secure: !import.meta.dev
    })

    // Hash the code before sending to GA4 so we never leak the raw
    // referral code into a third-party tool. Truncated to 12 hex chars —
    // enough to group by referrer, useless as an identifier.
    const hashed = await sha256Hex(code)
    event.context.waitUntil?.(
      sendServerEvent(event, {
        name: 'referral_landed',
        params: { code_hash: hashed.slice(0, 12) }
      })
    )
  }

  return sendRedirect(event, `/login${valid ? `?ref=${code}` : ''}`, 302)
})

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
