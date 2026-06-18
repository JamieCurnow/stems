import type { D1Database, DurableObjectState, Request as CfRequest } from '@cloudflare/workers-types'
import { Resend } from 'resend'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import * as schema from '../db/schema'
import { renderEmail, isEmailId, type EmailId } from '../emails'
import type { EmailCategory } from '../utils/emailCategory'

/**
 * One DO instance per scheduled email. The instance is named (via
 * `idFromName`) on its dedupeKey so calling schedule twice with the same key
 * targets the same DO — the second call is a no-op.
 *
 * Storage shape:
 *   payload : ScheduledPayload   (the full job)
 *   meta    : { attempts, lastError? }   (observability)
 *
 * One alarm per DO. When it fires, the DO:
 *   1. Loads its payload + checks status is still 'scheduled'
 *   2. Resolves the recipient + audience filter (suppression / prefs)
 *   3. Renders the template + calls Resend.emails.send
 *   4. Persists 'sent' (or 'skipped') and exits — alarm is one-shot
 *
 * On send failure the DO re-throws; Cloudflare retries the alarm
 * automatically with backoff. We cap retries at MAX_ATTEMPTS so a
 * permanently bad template doesn't loop forever.
 */

const MAX_ATTEMPTS = 5

export interface ScheduledPayload {
  emailId: EmailId
  userId: string | null
  leadId: string | null
  props: Record<string, unknown>
  sendAt: number
  dedupeKey: string | null
  status: 'scheduled' | 'sent' | 'cancelled' | 'skipped'
  category: EmailCategory
  baseUrl: string
  createdAt: number
  /** Set by the runner if it skips the send (audience fail). */
  skipReason?: string
  /** Set when status flips out of 'scheduled'. */
  settledAt?: number
}

interface DoMeta {
  attempts: number
  lastError?: string
}

interface CFEnv {
  DB: D1Database
  RESEND_API_KEY: string
  MAIL_FROM: string
  PUBLIC_BASE_URL?: string
}

export class EmailScheduler {
  state: DurableObjectState
  env: CFEnv

  constructor(state: DurableObjectState, env: CFEnv) {
    this.state = state
    this.env = env
  }

  /**
   * RPC surface — JSON over fetch so we don't rely on the newer DO RPC
   * machinery (works on every workerd version we support).
   *
   *   POST /schedule  body: ScheduledPayload   -> { ok, fireAt? } | { ok, dedupe }
   *   POST /cancel                              -> { ok, status }
   *   GET  /status                              -> { payload, meta }
   *   POST /fire-now  (admin escape hatch)      -> { ok, fireAt }
   */
  async fetch(request: CfRequest): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/schedule') {
      const body = (await request.json()) as ScheduledPayload
      const existing = await this.state.storage.get<ScheduledPayload>('payload')
      if (existing && (existing.status === 'sent' || existing.status === 'cancelled')) {
        return Response.json({ ok: true, dedupe: existing.status })
      }
      if (existing && existing.status === 'scheduled') {
        return Response.json({ ok: true, dedupe: 'already-scheduled' })
      }
      const payload: ScheduledPayload = { ...body, status: 'scheduled' }
      await this.state.storage.put('payload', payload)
      await this.state.storage.put<DoMeta>('meta', { attempts: 0 })
      // Past sendAts fire ~immediately on the next CF tick.
      const fireAt = Math.max(payload.sendAt, Date.now() + 1000)
      await this.state.storage.setAlarm(fireAt)
      return Response.json({ ok: true, fireAt })
    }

    if (request.method === 'POST' && url.pathname === '/cancel') {
      const payload = await this.state.storage.get<ScheduledPayload>('payload')
      if (!payload) return Response.json({ ok: true, status: 'no-payload' })
      if (payload.status !== 'scheduled') {
        return Response.json({ ok: true, status: payload.status })
      }
      const next: ScheduledPayload = { ...payload, status: 'cancelled', settledAt: Date.now() }
      await this.state.storage.put('payload', next)
      await this.state.storage.deleteAlarm()
      return Response.json({ ok: true, status: 'cancelled' })
    }

    if (request.method === 'GET' && url.pathname === '/status') {
      const payload = await this.state.storage.get<ScheduledPayload>('payload')
      const meta = await this.state.storage.get<DoMeta>('meta')
      return Response.json({ payload: payload ?? null, meta: meta ?? null })
    }

    if (request.method === 'POST' && url.pathname === '/fire-now') {
      const payload = await this.state.storage.get<ScheduledPayload>('payload')
      if (!payload) return Response.json({ ok: false, status: 'no-payload' }, { status: 404 })
      if (payload.status !== 'scheduled') {
        return Response.json({ ok: false, status: payload.status })
      }
      const fireAt = Date.now()
      await this.state.storage.setAlarm(fireAt)
      return Response.json({ ok: true, fireAt })
    }

    return new Response('Not found', { status: 404 })
  }

  /**
   * Alarm handler. CF invokes this when the alarm time hits. Re-throwing
   * causes CF to retry with backoff; we cap attempts at MAX_ATTEMPTS so a
   * poison message can't loop forever.
   */
  async alarm(): Promise<void> {
    const payload = await this.state.storage.get<ScheduledPayload>('payload')
    if (!payload) return
    if (payload.status !== 'scheduled') return

    const meta = (await this.state.storage.get<DoMeta>('meta')) ?? { attempts: 0 }
    if (meta.attempts >= MAX_ATTEMPTS) {
      await this.markSkipped(payload, `max-attempts-exceeded: ${meta.lastError ?? 'unknown'}`)
      return
    }
    meta.attempts += 1
    await this.state.storage.put('meta', meta)

    try {
      await this.dispatch(payload)
      const next: ScheduledPayload = { ...payload, status: 'sent', settledAt: Date.now() }
      await this.state.storage.put('payload', next)
      await this.mirrorToD1(next)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await this.state.storage.put('meta', { ...meta, lastError: msg })
      throw err
    }
  }

  /* -------------------------------------------------------------- */

  private async dispatch(payload: ScheduledPayload) {
    if (!isEmailId(payload.emailId)) {
      await this.markSkipped(payload, `unknown-template: ${payload.emailId}`)
      return
    }

    const db = drizzle(this.env.DB, { schema })

    const recipient = await this.resolveRecipient(db, payload)
    if (!recipient) {
      await this.markSkipped(payload, 'no-recipient')
      return
    }

    const audience = await this.audienceCheck(db, recipient, payload.category)
    if (!audience.allowed) {
      await this.markSkipped(payload, audience.reason ?? 'audience-fail')
      return
    }

    const unsubscribeUrl = await this.resolveUnsubscribeUrl(
      db, recipient, payload.category, payload.baseUrl
    )

    const rendered = renderEmail(payload.emailId as EmailId, payload.props as never, {
      baseUrl: payload.baseUrl,
      recipientEmail: recipient.email,
      unsubscribeUrl
    })

    const resend = new Resend(this.env.RESEND_API_KEY)
    const result = await resend.emails.send(
      {
        from: this.env.MAIL_FROM,
        to: recipient.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      },
      { idempotencyKey: payload.dedupeKey ?? this.state.id.toString() }
    )
    if (result.error) throw new Error(`Resend send failed: ${result.error.message}`)
  }

  private async resolveRecipient(
    db: ReturnType<typeof drizzle<typeof schema>>,
    payload: ScheduledPayload
  ): Promise<{ email: string; userId: string | null; leadId: string | null } | null> {
    if (payload.userId) {
      const u = await db.query.user.findFirst({ where: eq(schema.user.id, payload.userId) })
      if (u?.email) return { email: u.email, userId: payload.userId, leadId: null }
      return null
    }
    if (payload.leadId) {
      const l = await db.query.lead.findFirst({ where: eq(schema.lead.id, payload.leadId) })
      if (l?.email) return { email: l.email, userId: null, leadId: payload.leadId }
      return null
    }
    return null
  }

  private async audienceCheck(
    db: ReturnType<typeof drizzle<typeof schema>>,
    recipient: { email: string; userId: string | null; leadId: string | null },
    category: EmailCategory
  ): Promise<{ allowed: boolean; reason?: string }> {
    const suppressed = await db.query.emailSuppression.findFirst({
      where: eq(schema.emailSuppression.email, recipient.email.toLowerCase())
    })
    if (suppressed) return { allowed: false, reason: 'suppressed' }
    if (category === 'transactional') return { allowed: true }
    if (recipient.userId) {
      const prefs = await db.query.emailPreferences.findFirst({
        where: eq(schema.emailPreferences.userId, recipient.userId)
      })
      if (prefs) {
        if (category === 'marketing' && !prefs.marketingEnabled) {
          return { allowed: false, reason: 'marketing-disabled' }
        }
        if (category === 'product' && !prefs.productEnabled) {
          return { allowed: false, reason: 'product-disabled' }
        }
      }
    }
    return { allowed: true }
  }

  private async resolveUnsubscribeUrl(
    db: ReturnType<typeof drizzle<typeof schema>>,
    recipient: { email: string; userId: string | null; leadId: string | null },
    category: EmailCategory,
    baseUrl: string
  ): Promise<string> {
    if (recipient.userId) {
      const prefs = await db.query.emailPreferences.findFirst({
        where: eq(schema.emailPreferences.userId, recipient.userId)
      })
      if (prefs?.unsubscribeToken) {
        const u = new URL(`${baseUrl}/email/unsubscribe`)
        u.searchParams.set('token', prefs.unsubscribeToken)
        u.searchParams.set('category', category)
        return u.toString()
      }
    }
    if (recipient.leadId) {
      const lead = await db.query.lead.findFirst({
        where: eq(schema.lead.id, recipient.leadId)
      })
      if (lead?.unsubscribeToken) {
        const u = new URL(`${baseUrl}/email/unsubscribe`)
        u.searchParams.set('token', lead.unsubscribeToken)
        u.searchParams.set('category', category)
        return u.toString()
      }
    }
    const u = new URL(`${baseUrl}/email/unsubscribe`)
    u.searchParams.set('email', recipient.email)
    u.searchParams.set('category', category)
    return u.toString()
  }

  private async markSkipped(payload: ScheduledPayload, reason: string) {
    const next: ScheduledPayload = {
      ...payload, status: 'skipped', skipReason: reason, settledAt: Date.now()
    }
    await this.state.storage.put('payload', next)
    await this.mirrorToD1(next)
  }

  /**
   * Best-effort mirror of terminal status into the D1 audit table so admins
   * can browse what's been sent. Failures are swallowed — the DO is the
   * source of truth.
   */
  private async mirrorToD1(payload: ScheduledPayload) {
    try {
      const db = drizzle(this.env.DB, { schema })
      const idStr = this.state.id.toString()
      await db
        .update(schema.scheduledEmail)
        .set({
          status: payload.status,
          settledAt: payload.settledAt ? new Date(payload.settledAt) : new Date(),
          note: payload.skipReason ?? null
        })
        .where(eq(schema.scheduledEmail.id, idStr))
    } catch (err) {
      console.warn('[EmailScheduler] D1 mirror failed', err)
    }
  }
}
