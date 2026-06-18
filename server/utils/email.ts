import type { H3Event } from 'h3'
import type { DurableObjectNamespace } from '@cloudflare/workers-types'
import { and, eq, lte } from 'drizzle-orm'
import { useDb, type Db } from './db'
import { useResend, mailFrom, publicBaseUrl } from './resend'
import * as schema from '../db/schema'
import { renderEmail, type EmailId } from '../emails'
import { EMAIL_CATEGORY, type EmailCategory } from './emailCategory'

/* ------------------------------------------------------------------ */
/* Preferences + suppression                                          */
/* ------------------------------------------------------------------ */

const randomToken = () => {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Idempotently provision the user's email preference row. Anyone we send to
 * needs an unsubscribe token, so we lazily create the row whenever we look
 * it up.
 */
export async function ensureEmailPreferences(db: Db, userId: string) {
  const existing = await db.query.emailPreferences.findFirst({
    where: eq(schema.emailPreferences.userId, userId)
  })
  if (existing) return existing

  const row: schema.EmailPreferencesRow = {
    userId,
    marketingEnabled: true,
    productEnabled: true,
    transactionalEnabled: true,
    unsubscribeToken: randomToken(),
    updatedAt: new Date()
  }
  await db.insert(schema.emailPreferences).values(row).onConflictDoNothing()
  const fresh = await db.query.emailPreferences.findFirst({
    where: eq(schema.emailPreferences.userId, userId)
  })
  return fresh ?? row
}

export async function isSuppressed(db: Db, email: string): Promise<boolean> {
  const row = await db.query.emailSuppression.findFirst({
    where: eq(schema.emailSuppression.email, email.toLowerCase())
  })
  return !!row
}

interface CanSendArgs {
  db: Db
  email: string
  category: EmailCategory
  userId?: string | null
  leadId?: string | null
}

export interface CanSendResult {
  allowed: boolean
  reason?: string
}

/**
 * Decide whether to send `category` to `email`. Order:
 *  1. Hard suppression (bounces, complaints, manual block) — never sends.
 *  2. Transactional always allowed past step 1.
 *  3. User's per-category preference if a userId is supplied.
 *  4. Lead-level marketing preference if a leadId is supplied (suppression only).
 */
export async function canSendEmail({
  db,
  email,
  category,
  userId,
  leadId
}: CanSendArgs): Promise<CanSendResult> {
  if (await isSuppressed(db, email)) {
    return { allowed: false, reason: 'suppressed' }
  }
  if (category === 'transactional') return { allowed: true }
  if (userId) {
    const prefs = await ensureEmailPreferences(db, userId)
    if (category === 'marketing' && !prefs.marketingEnabled) {
      return { allowed: false, reason: 'marketing-disabled' }
    }
    if (category === 'product' && !prefs.productEnabled) {
      return { allowed: false, reason: 'product-disabled' }
    }
  }
  if (leadId) {
    // Lead presence in lead table = consent. Suppression already covered.
  }
  return { allowed: true }
}

/* ------------------------------------------------------------------ */
/* Sending                                                            */
/* ------------------------------------------------------------------ */

interface SendArgs {
  emailId: EmailId
  to: string
  props: Record<string, unknown>
  /** Stable key for Resend idempotency (prevents double-send on retries). */
  idempotencyKey?: string
  /** Optional unsubscribe URL override; otherwise auto-derived. */
  unsubscribeUrl?: string
}

interface SendContext {
  baseUrl: string
  unsubscribeUrl: string
  to: string
}

function buildUnsubscribeUrl(baseUrl: string, token: string, category: EmailCategory) {
  const u = new URL(`${baseUrl}/email/unsubscribe`)
  u.searchParams.set('token', token)
  u.searchParams.set('category', category)
  return u.toString()
}

interface ResolveContextArgs {
  event: H3Event
  to: string
  category: EmailCategory
  userId?: string | null
  leadId?: string | null
  override?: string
}

async function resolveSendContext({
  event,
  to,
  category,
  userId,
  leadId,
  override
}: ResolveContextArgs): Promise<SendContext> {
  const db = useDb(event)
  const baseUrl = publicBaseUrl(event)

  if (override) return { baseUrl, unsubscribeUrl: override, to }

  if (userId) {
    const prefs = await ensureEmailPreferences(db, userId)
    return {
      baseUrl,
      unsubscribeUrl: buildUnsubscribeUrl(baseUrl, prefs.unsubscribeToken, category),
      to
    }
  }
  if (leadId) {
    const lead = await db.query.lead.findFirst({ where: eq(schema.lead.id, leadId) })
    if (lead) {
      return {
        baseUrl,
        unsubscribeUrl: buildUnsubscribeUrl(baseUrl, lead.unsubscribeToken, category),
        to
      }
    }
  }
  // Anonymous fallback (admin test endpoint, etc.) — points at a generic
  // landing that just suppresses by email.
  const u = new URL(`${baseUrl}/email/unsubscribe`)
  u.searchParams.set('email', to)
  u.searchParams.set('category', category)
  return { baseUrl, unsubscribeUrl: u.toString(), to }
}

/**
 * Render + send an email immediately via Resend. Throws on send failure so
 * the caller can decide whether to retry.
 *
 * Audience checks (suppression, preferences) are NOT performed here — call
 * canSendEmail first when sending non-transactional templates.
 */
export async function sendEmail(
  event: H3Event,
  args: SendArgs & { userId?: string | null; leadId?: string | null }
) {
  const { emailId, to, props, idempotencyKey, userId, leadId, unsubscribeUrl: override } = args
  const category = EMAIL_CATEGORY[emailId]
  const ctx = await resolveSendContext({ event, to, category, userId, leadId, override })

  const rendered = renderEmail(emailId, props as never, {
    baseUrl: ctx.baseUrl,
    recipientEmail: to,
    unsubscribeUrl: ctx.unsubscribeUrl
  })

  const resend = useResend(event)
  const from = mailFrom(event)

  const result = await resend.emails.send(
    {
      from,
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        'List-Unsubscribe': `<${ctx.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      }
    },
    idempotencyKey ? { idempotencyKey } : undefined
  )

  if (result.error) {
    throw createError({
      statusCode: 502,
      statusMessage: `Resend send failed for ${emailId}: ${result.error.message}`
    })
  }
  return result.data
}

/* ------------------------------------------------------------------ */
/* Scheduling                                                         */
/* ------------------------------------------------------------------ */

interface ScheduleArgs {
  emailId: EmailId
  /** Send-at as a JS Date or unix-millis number. */
  sendAt: Date | number
  props: Record<string, unknown>
  /** Stable key — calling twice with the same key is a no-op. */
  dedupeKey?: string
  userId?: string | null
  leadId?: string | null
}

/**
 * Resolve the EmailScheduler DO namespace from the event. Returns null
 * when the binding is missing (i.e. `nuxt dev` — Nitro runs without the
 * wrapper). `scheduleEmail` falls back to a D1-only flow in that case.
 */
function emailSchedulerNs(event: H3Event): DurableObjectNamespace | null {
  const env = event.context.cloudflare?.env
  const ns = env?.EMAIL_SCHEDULER
  return (ns as DurableObjectNamespace | undefined) ?? null
}

/**
 * Schedule an email via the EmailScheduler Durable Object. Each scheduled
 * email gets its own DO instance — keyed by dedupeKey when provided so
 * re-firing the trigger lands on the same DO and is a no-op. The DO sets a
 * single alarm at sendAt; CF retries on failure with backoff up to
 * MAX_ATTEMPTS.
 *
 * Also writes a row into scheduledEmail for admin inspection. The DO is the
 * source of truth — D1 is a best-effort mirror.
 *
 * Returns the audit row id (== DO id when DO is wired, UUID otherwise) so
 * callers can store it and cancel directly.
 */
export async function scheduleEmail(
  event: H3Event,
  { emailId, sendAt, props, dedupeKey, userId, leadId }: ScheduleArgs
): Promise<string> {
  const db = useDb(event)
  const ns = emailSchedulerNs(event)
  const sendAtMs = sendAt instanceof Date ? sendAt.getTime() : sendAt
  const baseUrl = publicBaseUrl(event)

  // Existing audit row? Idempotent — re-poke the DO (terminal status is a
  // no-op there) but reuse the same audit id.
  if (dedupeKey) {
    const existing = await db.query.scheduledEmail.findFirst({
      where: eq(schema.scheduledEmail.dedupeKey, dedupeKey)
    })
    if (existing) {
      if (ns) {
        const stub = ns.get(ns.idFromName(dedupeKey))
        await stub.fetch('https://do/schedule', {
          method: 'POST',
          body: JSON.stringify(
            buildPayload({
              emailId,
              userId: userId ?? null,
              leadId: leadId ?? null,
              props,
              sendAtMs,
              dedupeKey,
              baseUrl
            })
          )
        })
      }
      return existing.id
    }
  }

  // Audit id == DO id when DO is wired, else a plain UUID.
  const doId = ns ? (dedupeKey ? ns.idFromName(dedupeKey) : ns.newUniqueId()) : null
  const auditId = doId ? doId.toString() : crypto.randomUUID()

  await db.insert(schema.scheduledEmail).values({
    id: auditId,
    dedupeKey: dedupeKey ?? null,
    emailId,
    userId: userId ?? null,
    leadId: leadId ?? null,
    props: JSON.stringify(props),
    sendAt: new Date(sendAtMs),
    status: 'scheduled',
    settledAt: null,
    note: null,
    createdAt: new Date()
  })

  if (ns && doId) {
    const stub = ns.get(doId)
    await stub.fetch('https://do/schedule', {
      method: 'POST',
      body: JSON.stringify(
        buildPayload({
          emailId,
          userId: userId ?? null,
          leadId: leadId ?? null,
          props,
          sendAtMs,
          dedupeKey: dedupeKey ?? null,
          baseUrl
        })
      )
    })
  }

  return auditId
}

interface BuildPayloadArgs {
  emailId: EmailId
  userId: string | null
  leadId: string | null
  props: Record<string, unknown>
  sendAtMs: number
  dedupeKey: string | null
  baseUrl: string
}

function buildPayload({ emailId, userId, leadId, props, sendAtMs, dedupeKey, baseUrl }: BuildPayloadArgs) {
  return {
    emailId,
    userId,
    leadId,
    props,
    sendAt: sendAtMs,
    dedupeKey,
    status: 'scheduled' as const,
    category: EMAIL_CATEGORY[emailId],
    baseUrl,
    createdAt: Date.now()
  }
}

/**
 * Cancel a single scheduled email by audit id. Calls into the DO to stop
 * the alarm and writes the status back to D1.
 */
export async function cancelScheduledEmail(event: H3Event, id: string, reason = 'cancelled') {
  const db = useDb(event)
  const ns = emailSchedulerNs(event)
  if (ns) {
    try {
      const stub = ns.get(ns.idFromString(id))
      await stub.fetch('https://do/cancel', { method: 'POST' })
    } catch {
      // DO id might be malformed (legacy uuid) — fall through to D1 only.
    }
  }
  await db
    .update(schema.scheduledEmail)
    .set({ status: 'cancelled', settledAt: new Date(), note: reason })
    .where(and(eq(schema.scheduledEmail.id, id), eq(schema.scheduledEmail.status, 'scheduled')))
}

interface CancelByDedupeArgs {
  /** Prefix match — cancel every still-scheduled row whose dedupeKey starts
      with this prefix. Useful when a state changes and a whole family of
      future sends no longer applies (e.g. `lead-`, `trial-`, `winback-`). */
  dedupePrefix?: string
  /** Or specify exact dedupeKey */
  dedupeKey?: string
  userId?: string | null
  leadId?: string | null
  reason?: string
}

/**
 * Cancel one or many scheduled rows matching the given criteria. Used when
 * the user crosses a state boundary (lead → trial, trial → paid, paid →
 * cancelled, cancelled → resubscribed) and a future trigger no longer
 * applies.
 */
export async function cancelScheduledEmails(event: H3Event, args: CancelByDedupeArgs) {
  const db = useDb(event)
  const ns = emailSchedulerNs(event)
  const reason = args.reason ?? 'state-change'

  const conditions: ReturnType<typeof eq>[] = []
  if (args.dedupeKey) conditions.push(eq(schema.scheduledEmail.dedupeKey, args.dedupeKey))
  if (args.userId) conditions.push(eq(schema.scheduledEmail.userId, args.userId))
  if (args.leadId) conditions.push(eq(schema.scheduledEmail.leadId, args.leadId))

  // dedupePrefix is filtered in JS (D1 doesn't expose LIKE via drizzle's
  // `like` helper without a sql template tag; cheap at our scale).
  const candidates = await db
    .select()
    .from(schema.scheduledEmail)
    .where(
      and(
        eq(schema.scheduledEmail.status, 'scheduled'),
        conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined
      )
    )

  const toCancel = args.dedupePrefix
    ? candidates.filter((c) => c.dedupeKey?.startsWith(args.dedupePrefix!))
    : candidates

  if (toCancel.length === 0) return 0
  for (const row of toCancel) {
    if (ns) {
      try {
        const stub = ns.get(ns.idFromString(row.id))
        await stub.fetch('https://do/cancel', { method: 'POST' })
      } catch {
        // ignore — D1 row still flips below
      }
    }
    await db
      .update(schema.scheduledEmail)
      .set({ status: 'cancelled', settledAt: new Date(), note: reason })
      .where(and(eq(schema.scheduledEmail.id, row.id), eq(schema.scheduledEmail.status, 'scheduled')))
  }
  return toCancel.length
}

/* ------------------------------------------------------------------ */
/* Catch-up runner (fallback / dev path)                              */
/* ------------------------------------------------------------------ */

interface RunnerOpts {
  /** Max rows to process per invocation. Default 50. */
  limit?: number
}

/**
 * Catch-up runner. Two modes:
 *
 *  - DO bound (production): re-poke any audit rows still 'scheduled' past
 *    their sendAt. The DO dedupes (terminal status → no-op). Pure safety net.
 *
 *  - DO unbound (dev / local): drain the queue by sending directly via
 *    sendEmail. Same audience checks. This is how dev exercises scheduled
 *    sends.
 */
export async function runScheduledEmailQueue(event: H3Event, { limit = 50 }: RunnerOpts = {}) {
  const db = useDb(event)
  const ns = emailSchedulerNs(event)
  const baseUrl = publicBaseUrl(event)
  const now = new Date()
  const due = await db
    .select()
    .from(schema.scheduledEmail)
    .where(and(eq(schema.scheduledEmail.status, 'scheduled'), lte(schema.scheduledEmail.sendAt, now)))
    .limit(limit)

  if (ns) {
    let repoked = 0
    for (const row of due) {
      try {
        const stub = ns.get(ns.idFromString(row.id))
        await stub.fetch('https://do/schedule', {
          method: 'POST',
          body: JSON.stringify(
            buildPayload({
              emailId: row.emailId as EmailId,
              userId: row.userId,
              leadId: row.leadId,
              props: JSON.parse(row.props || '{}'),
              sendAtMs: row.sendAt.getTime(),
              dedupeKey: row.dedupeKey,
              baseUrl
            })
          )
        })
        repoked++
      } catch (err) {
        console.warn('[email-runner] re-poke failed for', row.id, err)
      }
    }
    return { mode: 'do-repoke', processed: due.length, repoked }
  }

  // Dev fallback path. No DO available, send directly.
  let sent = 0
  let skipped = 0
  let failed = 0
  for (const row of due) {
    try {
      const recipient = await resolveRecipientFromRow(db, row)
      if (!recipient) {
        await markRowSkipped(db, row.id, 'no-recipient')
        skipped++
        continue
      }
      const audience = await canSendEmail({
        db,
        email: recipient.email,
        category: EMAIL_CATEGORY[row.emailId as EmailId],
        userId: recipient.userId,
        leadId: recipient.leadId
      })
      if (!audience.allowed) {
        await markRowSkipped(db, row.id, audience.reason ?? 'audience-fail')
        skipped++
        continue
      }
      await sendEmail(event, {
        emailId: row.emailId as EmailId,
        to: recipient.email,
        userId: recipient.userId,
        leadId: recipient.leadId,
        idempotencyKey: row.dedupeKey ?? row.id,
        props: JSON.parse(row.props || '{}')
      })
      await db
        .update(schema.scheduledEmail)
        .set({ status: 'sent', settledAt: new Date() })
        .where(eq(schema.scheduledEmail.id, row.id))
      sent++
    } catch (err) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      await db
        .update(schema.scheduledEmail)
        .set({ note: `error: ${msg.slice(0, 240)}` })
        .where(eq(schema.scheduledEmail.id, row.id))
      console.error('[email-runner] dev send failed', row.id, msg)
    }
  }
  return { mode: 'd1-direct', processed: due.length, sent, skipped, failed }
}

interface RowRecipient {
  email: string
  userId: string | null
  leadId: string | null
}

async function resolveRecipientFromRow(db: Db, row: schema.ScheduledEmailRow): Promise<RowRecipient | null> {
  if (row.userId) {
    const u = await db.query.user.findFirst({ where: eq(schema.user.id, row.userId) })
    if (u?.email) return { email: u.email, userId: row.userId, leadId: null }
    return null
  }
  if (row.leadId) {
    const l = await db.query.lead.findFirst({ where: eq(schema.lead.id, row.leadId) })
    if (l?.email) return { email: l.email, userId: null, leadId: row.leadId }
    return null
  }
  return null
}

async function markRowSkipped(db: Db, id: string, reason: string) {
  await db
    .update(schema.scheduledEmail)
    .set({ status: 'skipped', settledAt: new Date(), note: reason })
    .where(eq(schema.scheduledEmail.id, id))
}
