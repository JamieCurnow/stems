# 12 — Cron Triggers

Scheduled tasks that run inside your Worker without an external cron-as-a-service. Cloudflare's [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) call a `scheduled()` handler on your Worker at the cadence you set in `wrangler.jsonc`.

This stack already has one cron-worthy task — draining the `scheduledEmail` queue as a safety net for the `EmailScheduler` DO. The DO is primary (one alarm per email), but if a row's `sendAt` slips past for any reason, a 1-minute cron sweep catches it.

---

## When to use cron triggers vs. Durable Object alarms

| You need to…                                          | Use…                                              |
| ----------------------------------------------------- | ------------------------------------------------- |
| Fire a job at a specific future time, once            | **DO alarm** — see [`06-durable-objects-scheduling.md`](./06-durable-objects-scheduling.md) |
| Run a job at a fixed cadence (every minute, hourly…)  | **Cron trigger**                                  |
| Recurring sweep / catch-up over a queue table         | **Cron trigger**                                  |
| Periodic external poll (webhook reconciliation, etc.) | **Cron trigger**                                  |

DOs are precise but per-instance — you'd never spin up a DO just to run "every minute forever." Cron triggers are coarse but cheap.

---

## Wrangler config

Add `triggers.crons` inside each `env.<name>` block in `wrangler.jsonc`. Top-level cron triggers are not picked up by `wrangler deploy --env <name>` — they have to live alongside the rest of the per-env config.

```jsonc
"env": {
  "production": {
    "name": "stems",
    "triggers": {
      "crons": ["* * * * *"]    // every minute
    },
    // ...rest of the prod block
  }
}
```

Cron expressions use standard 5-field crontab syntax (`minute hour day month weekday`). Cloudflare's quirks:

- The smallest interval is **1 minute** (`* * * * *`).
- You can declare **multiple cron strings** in the array — all of them fire the same `scheduled()` handler, and `event.cron` tells you which one triggered.
- Cron fires from Cloudflare's edge, **independent of any HTTP traffic** — the Worker spins up on its own.

Common patterns:

```jsonc
"crons": [
  "* * * * *",           // every minute
  "*/5 * * * *",         // every 5 minutes
  "0 * * * *",           // top of every hour
  "0 3 * * *",           // 03:00 UTC daily
  "0 0 * * 0"            // Sunday midnight UTC
]
```

There is **no DST adjustment** — everything is UTC.

---

## Two ways to wire the handler

You have a choice: implement `scheduled()` natively in the Worker wrapper, or have cron POST to an HTTP endpoint inside your Nitro app. Both work; pick by where you'd rather put the code.

### Option A — native `scheduled()` in the worker wrapper

`.cloudflare/worker.ts` re-exports the Nitro fetch handler and DO classes. You can add a `scheduled` export next to them:

```ts
// .cloudflare/worker.ts
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - build-time generated module
import nitroHandler from '../.output/server/index.mjs'

export { EmailScheduler } from '../server/durable-objects/EmailScheduler'

export default {
  fetch: nitroHandler.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Route by cron expression if you have more than one
    switch (event.cron) {
      case '* * * * *':
        ctx.waitUntil(runEmailQueue(env))
        break
      case '0 3 * * *':
        ctx.waitUntil(runDailyReconcile(env))
        break
    }
  }
}
```

- `ctx.waitUntil()` keeps the worker alive until the promise settles. **Don't `await` inside `scheduled()` directly** — return fast, let `waitUntil` finish the work.
- `env` is the same binding bag your Nitro handlers see via `event.context.cloudflare.env`. Helpers that take an `H3Event` won't work here — pass `env` straight to a function written for the cron path.

Trade-off: the worker wrapper now contains business logic. The Nitro app can't share imports with `.cloudflare/worker.ts` cleanly (the wrapper is bundled by wrangler, not Nitro), so you end up duplicating helpers or moving them to `shared/`.

### Option B — cron POSTs to a Nitro endpoint (this repo's choice)

Treat cron as just another HTTP caller. The handler stays inside `server/api/cron/*.post.ts`, shares all of Nitro's auto-imports and utils, and you can `curl` it during dev.

The wrangler wrapper then needs a `scheduled()` that forwards to that endpoint:

```ts
// .cloudflare/worker.ts
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import nitroHandler from '../.output/server/index.mjs'

export { EmailScheduler } from '../server/durable-objects/EmailScheduler'

export default {
  fetch: nitroHandler.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const req = new Request('https://internal/api/cron/email-scheduler', {
      method: 'POST',
      headers: { 'x-admin-secret': env.ADMIN_API_SECRET }
    })
    ctx.waitUntil(nitroHandler.fetch(req, env, ctx))
  }
}
```

- The hostname `https://internal` is ignored — the worker dispatches by path. Use a placeholder that's obviously not a real origin.
- Pass `env.ADMIN_API_SECRET` so the endpoint's `requireAdmin` check passes. This is the same header you use when curling the endpoint manually.

The endpoint itself:

```ts
// server/api/cron/email-scheduler.post.ts
import { requireAdmin } from '~~/server/utils/requireAdmin'
import { runScheduledEmailQueue } from '~~/server/utils/email'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const result = await runScheduledEmailQueue(event)
  return { ok: true, ...result }
})
```

This is the approach this stack uses. The HTTP layer makes the cron path trivially testable from the command line.

---

## Securing the cron endpoint

If your cron handler is an HTTP endpoint, **anyone who can hit your worker URL can hit it too** — there's no Cloudflare-side "only cron can call this" flag. Two layers of defence:

1. **Shared-secret header (`requireAdmin`).** The cron handler must send `X-Admin-Secret`; without it the endpoint 401s. See `server/utils/requireAdmin.ts`:

   ```ts
   export const requireAdmin = (event: H3Event) => {
     const env = event.context.cloudflare?.env
     const expected = env?.ADMIN_API_SECRET
     if (!expected) {
       throw createError({ statusCode: 500, statusMessage: 'ADMIN_API_SECRET is not configured' })
     }
     const provided = getHeader(event, 'x-admin-secret') || getQuery(event).secret
     if (provided !== expected) {
       throw createError({ statusCode: 401, statusMessage: 'Forbidden' })
     }
   }
   ```

2. **`ADMIN_API_SECRET` is a wrangler secret, not a plain `var`.** Set with:

   ```bash
   wrangler secret put ADMIN_API_SECRET --env production
   ```

   In dev, put it in `.dev.vars`. Never commit it.

The wrapper reads `env.ADMIN_API_SECRET` and injects it as a header — that closes the loop without exposing the secret to the public.

---

## Testing crons locally

`wrangler dev` doesn't fire crons automatically (they'd run constantly during dev). Two paths:

```bash
# 1. Hit the endpoint directly with curl — same path the wrapper uses
curl -X POST http://localhost:3000/api/cron/email-scheduler \
  -H "X-Admin-Secret: $ADMIN_API_SECRET"

# 2. Spin up wrangler dev with the test endpoint and POST to /__scheduled
#    (works in `wrangler dev` mode, not `nuxt dev`)
wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

For most dev work, option 1 is faster — you don't need wrangler's runtime, just Nitro.

---

## Observability

Cron invocations show up in **Workers Logs** the same as any other invocation, but filtered separately:

```bash
wrangler tail --env production --format pretty
# Look for { "event": { "cron": "* * * * *" } }
```

Each fire is metered as a Worker request against your plan. A `* * * * *` cron = 60 invocations/hour = 43,200/month. Add it to your headroom calculation.

If a cron job throws, the failure is recorded but **not retried** — Cloudflare's contract is "fire-and-log", not "fire-until-success." Build idempotency into the handler (each row's status flips out of `scheduled` on send, so a missed-and-retried tick is safe).

---

## Files to copy from `snippets/`

- `snippets/server/api/cron/email-scheduler.post.ts`
- `snippets/server/utils/requireAdmin.ts`
- The `triggers.crons` block in `snippets/wrangler.jsonc`
- The `scheduled()` export in `snippets/.cloudflare/worker.ts`
