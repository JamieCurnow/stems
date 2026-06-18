import { requireAdmin } from '~~/server/utils/requireAdmin'
import { renderEmail, isEmailId } from '~~/server/emails'
import { publicBaseUrl } from '~~/server/utils/resend'

/**
 * Internal: preview a rendered email in the browser. Reads template props
 * from the query string (each non-`secret` key becomes a prop, JSON-parsed
 * if possible — so `cap=12` lands as number 12, not the string "12").
 *
 *   GET /api/admin/email-preview/welcome?secret=$ADMIN_API_SECRET&firstName=Sam
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const name = getRouterParam(event, 'name')
  if (!name || !isEmailId(name)) {
    throw createError({ statusCode: 404, statusMessage: 'Unknown template' })
  }
  const query = getQuery(event)
  const props: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(query)) {
    if (k === 'secret') continue
    if (typeof v !== 'string') continue
    try {
      props[k] = JSON.parse(v)
    } catch {
      props[k] = v
    }
  }
  const baseUrl = publicBaseUrl(event)
  const rendered = renderEmail(name, props as never, {
    baseUrl,
    recipientEmail: 'preview@example.com',
    unsubscribeUrl: `${baseUrl}/email/unsubscribe?token=preview`
  })

  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  return rendered.html
})
