import { REFERRAL_COOKIE } from '~~/shared/utils/constants'
import { hashCode } from '~~/server/utils/analytics'

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

    // Capture 'referral_landed' server-side (the visitor may never reach a
    // page that runs client analytics). Hash the code first so the raw,
    // user-shareable identifier never reaches PostHog. Fire-and-forget via
    // waitUntil so the redirect isn't delayed; never let it break the redirect.
    try {
      const codeHash = await hashCode(code)
      const posthog = useServerPostHog()
      posthog.capture({
        distinctId: `ref:${codeHash}`,
        event: 'referral_landed',
        properties: { code_hash: codeHash }
      })
      const waitUntil = event.context.cloudflare?.waitUntil
      if (waitUntil) waitUntil(flushServerPostHog())
      else await flushServerPostHog()
    } catch (err) {
      console.warn('[analytics] referral_landed capture failed', (err as Error).message)
    }
  }

  return sendRedirect(event, `/login${valid ? `?ref=${code}` : ''}`, 302)
})
