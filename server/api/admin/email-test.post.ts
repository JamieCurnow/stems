import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/requireAdmin'
import { readZodBody } from '~~/server/utils/validation'
import { sendEmail } from '~~/server/utils/email'

const bodySchema = z.object({
  to: z.string({ error: '`to` required' }).min(1, '`to` required'),
  note: z.string().optional()
})

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
  const { to, note } = await readZodBody(event, bodySchema)

  const data = await sendEmail(event, {
    emailId: 'system-test',
    to,
    props: { note }
  })

  return { ok: true, resendId: data?.id ?? null }
})
