# 06 — Durable Objects: The EmailScheduler Pattern

A reusable pattern for "do this thing at a future timestamp" on Cloudflare. One DO instance per scheduled job, named by a dedupe key, with one alarm. Cloudflare's runtime is the source of truth for *when* the alarm fires; D1 mirrors job status for admin inspection and prefix-based cancellation.

The example here is email scheduling, but the same shape works for any deferred work: trial expiry checks, dunning reminders, scheduled exports, cron-like fan-outs. Read this guide as "how to use DOs for scheduling", not "how email scheduling works".

---

## Why a DO and not a Cron Trigger

Cloudflare ships native cron triggers in `wrangler.jsonc`'s `triggers.crons` — but they fire on a fixed schedule, not at arbitrary timestamps. For "fire at exactly T", you either:

1. Run a cron every minute, query D1 for due rows, send each one. Simple but you pay for the cron firing constantly.
2. Use a Durable Object per job with a single alarm. Each job sleeps until its exact time. No polling. This is what we do.

The DO approach has nicer properties:

- Exactly-once execution (alarm fires once per scheduled time).
- Retry-with-backoff on throw, built into the CF runtime, capped by our own attempt counter.
- Dedupe by name — `idFromName(dedupeKey)` makes idempotency cheap.
- No "missed minute" — the alarm fires when the time hits, regardless of cron cadence.

The trade-off is that DOs aren't available in local dev (`nuxt dev` runs Nitro without the wrapper). The `scheduleEmail` helper detects this and falls back to a D1-only queue. The fallback runner endpoint at `/api/cron/email-scheduler` drains that queue when invoked manually or via a cron trigger.

---

## The DO class

`server/durable-objects/EmailScheduler.ts` — full source in `snippets/server/durable-objects/EmailScheduler.ts`. The shape:

```ts
import type { D1Database, DurableObjectState, Request as CfRequest } from '@cloudflare/workers-types'

const MAX_ATTEMPTS = 5

export interface ScheduledPayload {
  emailId: string
  userId: string | null
  leadId: string | null
  props: Record<string, unknown>
  sendAt: number
  dedupeKey: string | null
  status: 'scheduled' | 'sent' | 'cancelled' | 'skipped'
  category: 'transactional' | 'product' | 'marketing'
  baseUrl: string
  createdAt: number
  skipReason?: string
  settledAt?: number
}

interface CFEnv {
  DB: D1Database
  RESEND_API_KEY: string
  MAIL_FROM: string
}

export class EmailScheduler {
  state: DurableObjectState
  env: CFEnv

  constructor(state: DurableObjectState, env: CFEnv) {
    this.state = state
    this.env = env
  }

  /**
   * RPC surface — JSON over fetch, no need for the newer DO RPC machinery.
   *
   *   POST /schedule   body: ScheduledPayload   → { ok, fireAt? } | { ok, dedupe }
   *   POST /cancel                              → { ok, status }
   *   GET  /status                              → { payload, meta }
   *   POST /fire-now   (admin escape hatch)     → { ok, fireAt }
   */
  async fetch(request: CfRequest): Promise<Response> {
    // ... handles /schedule, /cancel, /status, /fire-now
  }

  /** CF invokes this when the alarm time hits. */
  async alarm(): Promise<void> {
    const payload = await this.state.storage.get<ScheduledPayload>('payload')
    if (!payload || payload.status !== 'scheduled') return

    const meta = (await this.state.storage.get<DoMeta>('meta')) ?? { attempts: 0 }
    if (meta.attempts >= MAX_ATTEMPTS) {
      await this.markSkipped(payload, `max-attempts-exceeded: ${meta.lastError ?? 'unknown'}`)
      return
    }
    meta.attempts += 1
    await this.state.storage.put('meta', meta)

    try {
      await this.dispatch(payload)             // audience check + render + send
      await this.state.storage.put('payload', { ...payload, status: 'sent', settledAt: Date.now() })
      await this.mirrorToD1(payload)
    } catch (err) {
      await this.state.storage.put('meta', { ...meta, lastError: String(err) })
      throw err                                 // CF retries with backoff
    }
  }
}
```

Storage shape per DO instance:

```
payload : ScheduledPayload         ← the job
meta    : { attempts, lastError? } ← observability
```

One alarm per DO. When it fires, the DO:

1. Loads its payload, bails if status isn't `scheduled`.
2. Increments attempts; bails to `skipped` if at MAX_ATTEMPTS.
3. Resolves the recipient (user or lead) via D1.
4. Audience check — suppression + per-category prefs.
5. Renders the template, sends via Resend with `idempotencyKey = dedupeKey ?? state.id.toString()`.
6. Writes terminal status and mirrors to D1.
7. On throw: persists `lastError` and re-throws so CF retries.

---

## Wiring it up

Two configs need to agree:

**1. `.cloudflare/worker.ts`** re-exports the DO class:

```ts
import nitroHandler from '../.output/server/index.mjs'
export { EmailScheduler } from '../server/durable-objects/EmailScheduler'
export default nitroHandler
```

**2. `wrangler.jsonc`** declares the binding + class migration, **only in `env.staging` and `env.production`** (not at the top level — see [`01-cloudflare-setup.md`](./01-cloudflare-setup.md)):

```jsonc
"durable_objects": {
  "bindings": [{ "name": "EMAIL_SCHEDULER", "class_name": "EmailScheduler" }]
},
"migrations": [
  { "tag": "v1", "new_sqlite_classes": ["EmailScheduler"] }
]
```

The `migrations` array here is **Cloudflare-side** (how the DO class gets registered with the runtime). It is unrelated to D1's `migrations_dir`. They're separate config blocks, applied separately by wrangler.

When you add a new DO class later, bump the migration tag:

```jsonc
"migrations": [
  { "tag": "v1", "new_sqlite_classes": ["EmailScheduler"] },
  { "tag": "v2", "new_sqlite_classes": ["AnotherScheduler"] }
]
```

---

## Calling the DO from server code

The factory pattern again — pull the namespace from `event.context.cloudflare.env`:

```ts
function emailSchedulerNs(event: H3Event): DurableObjectNamespace | null {
  const ns = event.context.cloudflare?.env?.EMAIL_SCHEDULER
  return (ns as DurableObjectNamespace | undefined) ?? null
}

export async function scheduleEmail(event, args) {
  const ns = emailSchedulerNs(event)
  if (!ns) {
    // Dev fallback — write to D1 only, drain via /api/cron/email-scheduler
    return d1OnlyPath(args)
  }

  // Name the DO by dedupeKey (idempotent) or newUniqueId() for one-off sends
  const doId = args.dedupeKey ? ns.idFromName(args.dedupeKey) : ns.newUniqueId()
  const stub = ns.get(doId)

  await stub.fetch('https://do/schedule', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return doId.toString()
}
```

A few things to internalise:

- **`idFromName(key)` is the dedupe primitive.** Same key → same DO. The DO checks its own payload status before scheduling, so calling `/schedule` twice with the same key is safe — second call short-circuits.
- **The URL passed to `stub.fetch` is meaningless** beyond pathname/method routing inside the DO's `fetch`. The string `https://do/schedule` is a convention; the DO doesn't care about the host.
- **Returning `doId.toString()` to the caller** lets them store it and cancel later by id.

---

## Cancellation patterns

Two helpers, two grain levels:

```ts
// By exact id (you stored it when you scheduled)
await cancelScheduledEmail(event, id, 'reason')

// By query — userId, leadId, dedupeKey, or dedupePrefix
await cancelScheduledEmails(event, { userId, dedupePrefix: 'trial-', reason: 'trial-converted' })
```

`cancelScheduledEmails` walks the D1 audit table (the mirror), finds matching rows, calls `POST /cancel` on each DO. The DO marks itself cancelled and deletes its alarm.

The `dedupePrefix` pattern is the natural grain for state-machine cancellation:

| State transition           | Prefix to cancel        |
| -------------------------- | ----------------------- |
| Lead converts to trial     | `lead-`                 |
| Trial converts to paid     | `trial-`                |
| Paid cancels               | (often per-job, by id)  |
| Cancelled user resubscribes| `winback-`              |

---

## The D1 mirror

Every scheduled job also gets a row in `scheduledEmail`:

```sql
CREATE TABLE "scheduledEmail" (
  "id" text NOT NULL PRIMARY KEY,        -- matches DO id when DO is wired, else UUID
  "dedupeKey" text UNIQUE,
  "emailId" text NOT NULL,
  "userId" text REFERENCES "user"("id") ON DELETE CASCADE,
  "leadId" text REFERENCES "lead"("id") ON DELETE CASCADE,
  "props" text NOT NULL DEFAULT '{}',    -- JSON-encoded
  "sendAt" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'scheduled',
  "settledAt" integer,
  "note" text,
  "createdAt" integer NOT NULL
);
```

The DO is the **source of truth**; D1 is best-effort. The mirror exists so:

1. Admins can browse what's been sent / queued without enumerating every DO.
2. `cancelScheduledEmails({ dedupePrefix })` can find matching jobs by SQL.
3. The fallback runner (next section) has a queue to drain in dev.

The DO writes back to D1 on terminal status (`sent` / `cancelled` / `skipped`) via `mirrorToD1(payload)`. Failures in the mirror are swallowed (logged only) — the DO's own storage remains authoritative.

---

## The fallback runner

`server/api/cron/email-scheduler.post.ts`:

```ts
import { requireAdmin } from '~~/server/utils/requireAdmin'
import { runScheduledEmailQueue } from '~~/server/utils/email'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return { ok: true, ...(await runScheduledEmailQueue(event)) }
})
```

Two modes inside `runScheduledEmailQueue`:

- **DO bound** (production): re-pokes any audit rows still `scheduled` past their `sendAt`. Healthy jobs no-op because the DO's own dedupe guards against double-fires. It's a safety net for "the DO alarm somehow didn't fire" cases.

- **DO unbound** (dev): drains the queue by sending directly through `sendEmail`, running the audience check inline. Same external behaviour, no DO required.

Drive it in dev:

```bash
curl -X POST http://localhost:3000/api/cron/email-scheduler \
  -H "X-Admin-Secret: $ADMIN_API_SECRET"
```

In prod, hit it from a Cloudflare Cron Trigger every minute or so as a heartbeat — purely defensive.

---

## Naming + dedupe semantics

| Caller passes      | DO id resolution            | What you get                                                              |
| ------------------ | --------------------------- | ------------------------------------------------------------------------- |
| `dedupeKey: 'foo'` | `ns.idFromName('foo')`      | Deterministic — same key always names the same DO                         |
| (no `dedupeKey`)   | `ns.newUniqueId()`          | A fresh DO for this call. Useful for one-off sends with no idempotency need |

Pick stable `dedupeKey`s:

| Job                          | Good `dedupeKey`                                       |
| ---------------------------- | ------------------------------------------------------ |
| Trial reminder per user      | `trial-pre-end:${userId}`                              |
| Post-payment per subscription| `post-payment-day-1:${userId}`                         |
| Cancellation per sub         | `cancellation-confirmed:${userId}:${stripeSubId}`      |
| Win-back drip                | `winback-30:${userId}:${stripeSubId}`                  |
| Lead drip                    | `lead-myths:${leadId}`                                 |
| Monthly newsletter           | `monthly-newsletter:${YYYY-MM}:${userId}`              |

The first segment is the "family" — match it with `dedupePrefix` for bulk cancellation.

---

## DO id string format

When you serialise a DO id from `state.id.toString()`, it's 64 hex characters. Calling `ns.idFromString(idStr)` reconstitutes it. Two caveats:

- The format is case-sensitive. Don't lowercase/uppercase the id when persisting.
- Old audit rows might predate the DO migration and carry plain UUIDs. `cancelScheduledEmails` wraps `idFromString` in try/catch and falls through to D1-only on failure. Useful pattern when migrating.

---

## Local dev workflow

Local dev has no DO binding. To exercise scheduling in dev:

```bash
# 1. Trigger something that calls scheduleEmail() — writes a row to scheduledEmail.

# 2. Drain manually
curl -X POST http://localhost:3000/api/cron/email-scheduler \
  -H "X-Admin-Secret: $ADMIN_API_SECRET"

# Response: { mode: 'd1-direct', processed, sent, skipped, failed }
```

In prod the same endpoint returns `{ mode: 'do-repoke', processed, repoked }`.

---

## Operational tooling

The DO supports a `POST /fire-now` admin path that drags the alarm into the present. Useful for testing email content end-to-end without waiting 6 days for a trial reminder. Exposed via an admin endpoint that resolves the DO id from a `scheduledEmail` row and POSTs to the stub.

Browse + inspect via `GET /status`:

```ts
const stub = ns.get(ns.idFromString(scheduledEmailRow.id))
const r = await stub.fetch('https://do/status')
const { payload, meta } = await r.json()
// payload: ScheduledPayload | null
// meta:    { attempts, lastError? } | null
```

---

## Generalising

Strip "email" from this file and you have a generic deferred-work pattern. Substitutions for adapting:

- `ScheduledPayload.emailId` → whatever discriminates your job type.
- `dispatch(payload)` → whatever the work actually does (publish a message, invoke a webhook, run a DB job).
- Audience check → whatever pre-condition gates execution.
- `mirrorToD1` → your audit table.

The DO class, the wrapper at `.cloudflare/worker.ts`, the `wrangler.jsonc` declarations, the dev fallback runner — those don't change. They're the shape of "scheduling on Cloudflare", not specific to email.

---

## Gotchas

- **`durable_objects` and `migrations` declared only in env blocks**, not at the top level. Top-level declaration breaks `nuxt dev` because Miniflare can't find the DO class without the wrapper.
- **Dev has no DO**. Don't assume `scheduleEmail` fires anything in dev — the runner is your friend.
- **Migration ordering matters**. The DO class migration (`v1`) in `wrangler.jsonc` is a Cloudflare-side migration applied at deploy time. The D1 migration files in `server/db/migrations/` are SQL applied by `wrangler d1 migrations apply`. They're separate config blocks, applied by different mechanisms. Don't confuse them.
- **`wrangler.main` must point at `.cloudflare/worker.ts`**, not at `.output/server/index.mjs`. Pointing it back at the Nitro output removes the DO from the deploy bundle without warning.
- **DO id strings are case-sensitive and 64 hex chars**. Don't normalise them.
- **CF retries the alarm with backoff** on throw, up to its own internal budget. Pair that with the in-class `MAX_ATTEMPTS` cap so a permanently-broken job can't loop forever.

---

## Files to copy from `snippets/`

- `snippets/server/durable-objects/EmailScheduler.ts`
- `snippets/.cloudflare/worker.ts`
- `snippets/server/utils/email.ts` (covers schedule / cancel / runner)
- `snippets/server/api/cron/email-scheduler.post.ts`
- `wrangler.jsonc` (already covered in 01 — make sure DO bindings + migrations are inside `env.staging` / `env.production` only)
