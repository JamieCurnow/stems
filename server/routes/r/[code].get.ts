import { REFERRAL_COOKIE } from '~~/shared/utils/constants'

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
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      secure: !import.meta.dev
    })

    // TODO(posthog): capture a 'referral_landed' event here. Hash the code
    // (e.g. SHA-256, first 12 hex) before sending so the raw referral code
    // never reaches a third-party tool.
  }

  return sendRedirect(event, `/login${valid ? `?ref=${code}` : ''}`, 302)
})
