import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import * as schema from '~~/server/db/schema'

/**
 * Public, no-login unsubscribe endpoint. Two modes:
 *
 *   GET /email/unsubscribe?token=<token>&category=marketing
 *     - Looks the token up in user prefs OR lead.
 *     - User: flips the matching category boolean.
 *     - Lead: writes the lead's email into emailSuppression.
 *
 *   GET /email/unsubscribe?email=<email>&category=marketing
 *     - Anonymous fallback. Suppresses by email.
 *
 * One-click per GDPR — no confirmation step. The unsubscribe is applied
 * immediately and the page just confirms it.
 *
 * Lives in server/routes/ (not server/api/) — Nitro maps server/routes/* to
 * the URL root, so this responds at /email/unsubscribe.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const token = typeof q.token === 'string' ? q.token : null
  const email = typeof q.email === 'string' ? q.email.toLowerCase() : null
  const category = (typeof q.category === 'string' ? q.category : 'marketing').toLowerCase()
  const db = useDb(event)
  const now = new Date()

  let appliedTo: 'user' | 'lead' | 'email' | null = null
  let appliedCategory = category

  if (token) {
    const prefs = await db.query.emailPreferences.findFirst({
      where: eq(schema.emailPreferences.unsubscribeToken, token)
    })
    if (prefs) {
      const updates: Partial<schema.EmailPreferencesRow> = { updatedAt: now }
      if (category === 'product') updates.productEnabled = false
      else if (category === 'transactional') updates.transactionalEnabled = false
      else updates.marketingEnabled = false
      await db
        .update(schema.emailPreferences)
        .set(updates)
        .where(eq(schema.emailPreferences.userId, prefs.userId))
      appliedTo = 'user'
    } else {
      const lead = await db.query.lead.findFirst({
        where: eq(schema.lead.unsubscribeToken, token)
      })
      if (lead) {
        await db
          .insert(schema.emailSuppression)
          .values({ email: lead.email.toLowerCase(), reason: 'manual', createdAt: now })
          .onConflictDoNothing()
        appliedTo = 'lead'
        appliedCategory = 'marketing'
      }
    }
  } else if (email) {
    await db
      .insert(schema.emailSuppression)
      .values({ email, reason: 'manual', createdAt: now })
      .onConflictDoNothing()
    appliedTo = 'email'
  }

  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  if (!appliedTo) {
    return `<!doctype html><meta charset="utf-8"><title>Unsubscribe</title>
<div style="font-family:Inter,sans-serif;max-width:480px;margin:80px auto;padding:32px;text-align:center;color:#1B1B1B;">
  <h1>That link looks expired</h1>
  <p>Drop us a note at <a href="mailto:{{MAIL_FROM_LOCAL}}@{{APP_DOMAIN}}">{{MAIL_FROM_LOCAL}}@{{APP_DOMAIN}}</a> and we'll sort it.</p>
</div>`
  }

  const niceCategory =
    appliedCategory === 'product'
      ? 'product update'
      : appliedCategory === 'transactional'
        ? 'transactional'
        : 'marketing'
  return `<!doctype html><meta charset="utf-8"><title>Unsubscribed</title>
<div style="font-family:Inter,sans-serif;max-width:480px;margin:80px auto;padding:32px;text-align:center;color:#1B1B1B;">
  <h1>You're unsubscribed</h1>
  <p>You won't get any more <strong>${niceCategory}</strong> emails from {{APP_NAME}}.</p>
  <p style="color:#6B6B6B;font-size:14px;margin-top:24px;">Changed your mind? <a href="/settings">Manage preferences</a> when you're signed in.</p>
</div>`
})
