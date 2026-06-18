import { requireAdmin } from '~~/server/utils/requireAdmin'
import { sendEmail } from '~~/server/utils/email'

/**
 * Internal: send a test email via Resend. Gated behind ADMIN_API_SECRET.
 * Body: { to: string, note?: string }
 *
 *   curl -X POST http://localhost:3000/api/admin/email-test \
 *     -H "X-Admin-Secret: $ADMIN_API_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "to": "you@example.com", "note": "smoke test" }'
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<{ to?: string; note?: string }>(event)
  if (!body?.to) throw createError({ statusCode: 400, statusMessage: '`to` required' })

  const data = await sendEmail(event, {
    emailId: 'system-test',
    to: body.to,
    props: { note: body.note }
  })

  return { ok: true, resendId: data?.id ?? null }
})
