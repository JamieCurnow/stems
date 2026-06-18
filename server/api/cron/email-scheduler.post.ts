import { requireAdmin } from '~~/server/utils/requireAdmin'
import { runScheduledEmailQueue } from '~~/server/utils/email'

/**
 * Drains the D1-backed `scheduledEmail` queue. Two modes:
 *  - DO bound (production): re-pokes audit rows still scheduled past their
 *    sendAt. Pure safety net — healthy jobs no-op via DO dedupe.
 *  - DO unbound (dev): drains directly via sendEmail. This is how dev
 *    exercises scheduled sends.
 *
 * Fired every minute by the Cloudflare Cron Trigger declared in
 * wrangler.jsonc → env.<name>.triggers.crons. .cloudflare/worker.ts forwards
 * the scheduled() event here. Hit it manually in dev:
 *
 *   curl -X POST http://localhost:3000/api/cron/email-scheduler \
 *     -H "X-Admin-Secret: $ADMIN_API_SECRET"
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const result = await runScheduledEmailQueue(event)
  return { ok: true, ...result }
})
