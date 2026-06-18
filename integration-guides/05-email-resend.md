# 05 — Email: Resend + Templates + Audience Control

Resend SDK for delivery. Plain TypeScript templates (no React Email). Per-user category preferences (transactional / product / marketing). Hard suppression for bounces and complaints. One-click unsubscribe with token-based public route.

---

## Install

```bash
npm i resend
# resend has @react-email/render as an undocumented peer — install it to keep
# the bundler happy even though we don't use React Email:
npm i @react-email/render
```

---

## Architecture

```
Trigger (signup / webhook / form / cron)
    │
    ▼
server/utils/email.ts
    │
    ├─ sendEmail(event, args)       ──► Resend.emails.send  (immediate)
    │
    └─ scheduleEmail(event, args)   ──► EmailScheduler DO   (covered in 06-)
```

Two paths:

- **Immediate** via `sendEmail(event, { emailId, to, props, idempotencyKey? })`. Renders the template, attaches one-click unsubscribe headers, sends through Resend. Audience check is **not** done automatically — call `canSendEmail` first for non-transactional sends.

- **Scheduled** via `scheduleEmail(event, { emailId, sendAt, dedupeKey, props })`. Writes an audit row to D1 and dispatches to the EmailScheduler Durable Object (one DO instance per scheduled email, one alarm). The DO performs the audience check **at send time**, so a user who unsubscribes between scheduling and firing still has their wishes honoured.

---

## The Resend factory

`server/utils/resend.ts`:

```ts
import { Resend } from 'resend'
import type { H3Event } from 'h3'

export const useResend = (event: H3Event): Resend => {
  const env = event.context.cloudflare?.env
  if (!env?.RESEND_API_KEY) {
    throw createError({ statusCode: 500, statusMessage: 'RESEND_API_KEY is not configured' })
  }
  return new Resend(env.RESEND_API_KEY)
}

export const mailFrom = (event: H3Event): string =>
  event.context.cloudflare?.env?.MAIL_FROM
    || '{{APP_NAME}} <{{MAIL_FROM_LOCAL}}@{{APP_DOMAIN}}>'

export const publicBaseUrl = (event: H3Event): string => {
  const env = event.context.cloudflare?.env
  if (env?.PUBLIC_BASE_URL) return env.PUBLIC_BASE_URL.replace(/\/$/, '')
  return getRequestURL(event).origin.replace(/\/$/, '')
}
```

`MAIL_FROM` must use a domain you've verified in Resend (SPF / DKIM / DMARC records on your DNS provider). Until that's done, sends will fail — verify the domain first.

---

## Templates

Plain TS functions. No JSX. No magic. The shape:

```ts
// server/emails/welcome.ts
import type { EmailTemplate } from './_types'
import { escapeHtml } from './_layout'

export interface WelcomeProps {
  firstName?: string
}

const template: EmailTemplate<WelcomeProps> = ({ firstName }, { baseUrl }) => ({
  subject: 'Welcome to {{APP_NAME}}',
  preheader: 'Glad you\'re here.',
  html: `
    <p>Hey ${firstName ? escapeHtml(firstName) : 'there'},</p>
    <p>Welcome aboard. <a href="${escapeHtml(baseUrl)}/app">Jump in</a>.</p>
  `,
  text: `Hey ${firstName ?? 'there'},

Welcome aboard. Jump in: ${baseUrl}/app
`
})

export default template
```

Three required outputs (`subject`, `html`, `text`) plus optional `preheader`. Always include `text` — Resend can auto-generate it but you lose control over voice.

The shared layout (`server/emails/_layout.ts`) wraps every `html` body with the brand header / footer / unsubscribe link. The runtime calls it for you in the `renderEmail` registry — you only author the body.

### The registry

`server/emails/index.ts`:

```ts
import welcome from './welcome'
import magicLink from './magic-link'
import systemTest from './system-test'

const templates = {
  welcome,
  'magic-link': magicLink,
  'system-test': systemTest
} as const satisfies Record<string, EmailTemplate<never>>

export type EmailId = keyof typeof templates
export const isEmailId = (id: string): id is EmailId => id in templates

export function renderEmail<Id extends EmailId>(
  id: Id,
  props: Parameters<(typeof templates)[Id]>[0],
  ctx: EmailTemplateContext
): RenderedTemplate {
  const tpl = templates[id] as EmailTemplate<typeof props>
  const out = tpl(props, ctx)
  return {
    subject: out.subject,
    html: renderLayoutHtml({ preheader: out.preheader, bodyHtml: out.html, ...ctx }),
    text: renderLayoutText({ bodyText: out.text, ...ctx })
  }
}
```

Adding a template = three changes:

1. Create `server/emails/<my-id>.ts`.
2. Import + register in `server/emails/index.ts`.
3. Add the category in `server/utils/emailCategory.ts`.

---

## Categories + audience check

`server/utils/emailCategory.ts`:

```ts
import type { EmailId } from '../emails'

export type EmailCategory = 'transactional' | 'product' | 'marketing'

export const EMAIL_CATEGORY: Record<EmailId, EmailCategory> = {
  'magic-link': 'transactional',           // sign-in links — must always send
  'system-test': 'transactional',
  welcome: 'product',
  'monthly-newsletter': 'marketing'
  // add new templates here
}
```

| Category        | Gated by user prefs?           | Use for                                                |
| --------------- | ------------------------------ | ------------------------------------------------------ |
| `transactional` | No (only suppression)          | Login links, receipts, cancellation confirmations      |
| `product`       | Yes — `productEnabled`         | Onboarding sequence, account events, in-product nudges |
| `marketing`     | Yes — `marketingEnabled`       | Newsletter, win-backs, referral progress               |

A login link must NEVER be category `marketing` — a user who has unsubscribed from marketing must still be able to sign in.

`canSendEmail({ db, email, category, userId?, leadId? })` checks (in order):

1. **`emailSuppression`** (hard bounces / complaints / manual blocks) — never sends.
2. **Transactional** → always allowed past step 1.
3. **User's per-category preference** if a `userId` is supplied.

Call it before non-transactional `sendEmail`. The scheduled path does this automatically inside the DO.

---

## Sending immediately

```ts
import { sendEmail, canSendEmail } from '~~/server/utils/email'

// Transactional — just send.
await sendEmail(event, {
  emailId: 'magic-link',
  to: user.email,
  props: { url }
})

// Product / marketing — check the audience first.
const audience = await canSendEmail({ db, email: user.email, category: 'product', userId: user.id })
if (audience.allowed) {
  await sendEmail(event, {
    emailId: 'welcome',
    to: user.email,
    userId: user.id,
    idempotencyKey: `welcome:${user.id}`,       // safe-to-retry key for Resend
    props: { firstName: user.name?.split(' ')[0] }
  })
}
```

`idempotencyKey` is passed straight to Resend — same key → same email, no duplicate sends on retries. Use a stable key like `<emailId>:<userId>` whenever the send is part of a state transition that might fire twice.

---

## Scheduling (future-dated)

```ts
import { scheduleEmail } from '~~/server/utils/email'

await scheduleEmail(event, {
  emailId: 'trial-pre-end',
  sendAt: Date.now() + 6 * 24 * 60 * 60 * 1000,
  dedupeKey: `trial-pre-end:${userId}`,
  userId,
  props: { manageBillingUrl: `${baseUrl}/billing` }
})
```

The `dedupeKey` is load-bearing: it's used to name the Durable Object, so calling `scheduleEmail` with the same key twice lands on the same DO and is a no-op (assuming the first call hasn't fired yet).

See [`06-durable-objects-scheduling.md`](./06-durable-objects-scheduling.md) for the DO internals.

### Cancelling scheduled sends

Most state transitions kill some future sends:

```ts
import { cancelScheduledEmails } from '~~/server/utils/email'

// Lead converted to trial → kill the lead-sequence drip
await cancelScheduledEmails(event, { leadId, dedupePrefix: 'lead-', reason: 'lead-converted' })

// Trial → paid → kill the trial reminders
await cancelScheduledEmails(event, { userId, dedupePrefix: 'trial-', reason: 'trial-converted' })

// User resubscribed after cancelling → kill the win-back sequence
await cancelScheduledEmails(event, { userId, dedupePrefix: 'winback-', reason: 'resubscribed' })

// One exact send
await cancelScheduledEmails(event, { dedupeKey: `post-payment-day-1:${userId}` })
```

The `dedupePrefix` filter lets you kill an entire family of sends in one call, which is the natural grain for state-machine transitions.

---

## Preferences API

`server/api/email/preferences.get.ts` — read the active user's prefs:

```ts
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)
  const prefs = await ensureEmailPreferences(db, user.id)
  return {
    marketingEnabled: prefs.marketingEnabled,
    productEnabled: prefs.productEnabled,
    transactionalEnabled: prefs.transactionalEnabled    // read-only
  }
})
```

`server/api/email/preferences.put.ts` — update them. `transactionalEnabled` is intentionally not editable from this endpoint.

---

## Public unsubscribe

`server/routes/email/unsubscribe.get.ts` is a public, login-less GET that handles both authenticated users (token-based) and anonymous leads (suppression by email). One-click unsubscribe per GDPR — no confirmation step.

```
GET /email/unsubscribe?token=<user-or-lead-token>&category=marketing
GET /email/unsubscribe?email=<email>&category=marketing       # anonymous fallback
```

The token routes:

- Matches a `user.emailPreferences.unsubscribeToken` → flips the matching category boolean on that user.
- Matches a `lead.unsubscribeToken` → writes the lead's email into `emailSuppression`.

The `List-Unsubscribe` header in every email points at this URL with the right token. Email clients that respect `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (Gmail, Apple Mail) one-click-unsubscribe straight into this endpoint.

---

## Bounce / complaint handling (Resend webhook)

`server/api/resend/webhook.post.ts` — Resend POSTs `email.bounced` and `email.complained` events here. Writes the recipient address into `emailSuppression`:

```ts
const reason = body.type === 'email.complained' ? 'complaint' : 'hard_bounce'
await db.insert(schema.emailSuppression)
  .values({ email: recipient, reason, createdAt: new Date() })
  .onConflictDoNothing()
```

Configure the webhook in the Resend Dashboard pointing at `https://{{APP_DOMAIN}}/api/resend/webhook`. Resend signs with Svix HMAC SHA-256; set `RESEND_WEBHOOK_SECRET` as a wrangler secret and the handler will require the `svix-signature` header.

---

## Admin tooling

`server/api/admin/email-test.post.ts` — send a one-shot test email:

```bash
curl -X POST http://localhost:3000/api/admin/email-test \
  -H "X-Admin-Secret: $ADMIN_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "to": "you@example.com", "note": "smoke test" }'
```

`server/api/admin/email-preview/[name].get.ts` — render a template inline in the browser, using query-string props:

```
GET /api/admin/email-preview/welcome?secret=$ADMIN_API_SECRET&firstName=Sam
```

Each query key (except `secret`) becomes a prop, JSON-parsed if possible (so `cap=12` lands as a number, not the string `"12"`).

Both gates run through `requireAdmin(event)` — header-based check against `ADMIN_API_SECRET`. Add a session-based admin gate too (`requireAdminUser(event)` in the snippets) if you build an admin UI.

---

## Resend domain setup

1. Add the domain in the Resend Dashboard → Domains.
2. Resend gives you DNS records (TXT/MX/CNAME for SPF, DKIM, return-path). Add them at your DNS provider.
3. Wait for verification. Until then, sends from that domain fail.
4. Set `MAIL_FROM` in `wrangler.jsonc` per env: `"MAIL_FROM": "{{APP_NAME}} <{{MAIL_FROM_LOCAL}}@{{APP_DOMAIN}}>"`.

Test by hitting `/api/admin/email-test`. If it lands in the inbox, you're done.

---

## Voice rules (worth a one-pager)

These are subjective conventions, encoded in `server/emails/_types.ts`. Steal them or replace them:

- No em-dashes. Use parentheses, commas, or two sentences.
- First-person, warm, confident.
- Short sentences. Plain words.
- Always include `text` plus `html`. Resend auto-generates plain text but you keep control.

---

## Gotchas

- **`@react-email/render` is a peer dep of `resend`**. Install it even though you don't use it; otherwise the bundler fails on `npm run build`.
- **Audience check at send time, not schedule time.** A user can unsubscribe in the window between scheduling and firing — the DO must check. The runtime helper `canSendEmail` is also called in the DO's `alarm()` handler.
- **A login link is `transactional`.** If you accidentally categorise it as `marketing`, an unsubscribed user can't sign in.
- **`List-Unsubscribe` is set on every send** by `sendEmail` and the DO. Don't remove it — Gmail throttles senders that don't.
- **`MAIL_FROM` must use a verified Resend domain.** Until verification completes, every send 4xxs. Easy to forget when bootstrapping a new env.

---

## Files to copy from `snippets/`

- `snippets/server/utils/resend.ts`
- `snippets/server/utils/email.ts`
- `snippets/server/utils/emailCategory.ts`
- `snippets/server/emails/_layout.ts`
- `snippets/server/emails/_types.ts`
- `snippets/server/emails/index.ts`
- `snippets/server/emails/magic-link.ts`
- `snippets/server/emails/system-test.ts`
- `snippets/server/emails/welcome.ts` (example template, replace with your own)
- `snippets/server/api/email/preferences.get.ts`
- `snippets/server/api/email/preferences.put.ts`
- `snippets/server/api/resend/webhook.post.ts`
- `snippets/server/api/admin/email-test.post.ts`
- `snippets/server/api/admin/email-preview/[name].get.ts`
- `snippets/server/routes/email/unsubscribe.get.ts`
- `snippets/server/db/migrations/0005_email.sql`
