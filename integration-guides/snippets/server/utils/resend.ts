import { Resend } from 'resend'
import type { H3Event } from 'h3'

/**
 * Build a Resend client bound to the request-scoped RESEND_API_KEY.
 *
 * Cloudflare bindings + secrets aren't available at module load — they live
 * on event.context.cloudflare.env per request. Same pattern as useDb /
 * useStripe.
 */
export const useResend = (event: H3Event): Resend => {
  const env = event.context.cloudflare?.env
  if (!env?.RESEND_API_KEY) {
    throw createError({
      statusCode: 500,
      statusMessage: 'RESEND_API_KEY is not configured'
    })
  }
  return new Resend(env.RESEND_API_KEY)
}

/** Default From — must use a verified Resend domain. */
export const mailFrom = (event: H3Event): string => {
  const env = event.context.cloudflare?.env
  return env?.MAIL_FROM || 'Stems <hello@stems.market>'
}

/**
 * Public origin for absolute links inside emails (unsubscribe, /r/<code>,
 * deep links). Falls back to the request origin so dev "just works".
 */
export const publicBaseUrl = (event: H3Event): string => {
  const env = event.context.cloudflare?.env
  if (env?.PUBLIC_BASE_URL) return env.PUBLIC_BASE_URL.replace(/\/$/, '')
  return getRequestURL(event).origin.replace(/\/$/, '')
}
