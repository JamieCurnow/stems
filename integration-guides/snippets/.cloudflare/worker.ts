/**
 * Worker entry. The Nitro `cloudflare-module` preset only exports a
 * default `{ fetch }` handler — but we also need to expose Durable
 * Object classes as named exports so wrangler can bind them.
 *
 * This file is the wrangler `main`. Wrangler bundles it with esbuild,
 * pulling in both the Nitro output (already a CF-targeted ESM bundle)
 * and the DO source.
 *
 * Local dev (`nuxt dev`) runs the Nitro bundle directly via Miniflare and
 * never sees this wrapper — which is why DOs are unavailable in dev. The
 * `scheduleEmail` helper detects the missing binding and falls back to a
 * D1-only queue.
 */

/*
 * `.output/server/index.mjs` is emitted by `nuxt build`, so it may or may
 * not exist at typecheck time. We use a `@ts-ignore` (not `@ts-expect-error`)
 * directive so it stays inert whether or not a local build has produced the
 * file. Don't name the directive tokens in `//` comments below — the
 * compiler would parse them as directives.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - build-time generated module, may be absent pre-build
import nitroHandler from '../.output/server/index.mjs'

// Re-export every DO class. Add new ones to ../server/durable-objects/ and
// re-export them here. Remember to also add the binding + migration to
// wrangler.jsonc → env.<name>.{durable_objects, migrations}.
export { EmailScheduler } from '../server/durable-objects/EmailScheduler'

/**
 * Cron triggers (`wrangler.jsonc` → env.<name>.triggers.crons) fire here.
 * Rather than implement business logic in this wrapper — which can't share
 * imports with the Nitro app cleanly — forward each cron to an internal
 * Nitro POST. The endpoint runs requireAdmin against ADMIN_API_SECRET, so
 * the same handler is reachable via curl during dev.
 *
 * Route by event.cron when you add more crons. Always wrap dispatch in
 * ctx.waitUntil — never await inside scheduled() directly.
 */
export default {
  fetch: nitroHandler.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    switch (event.cron) {
      case '* * * * *': {
        const req = new Request('https://internal/api/cron/email-scheduler', {
          method: 'POST',
          headers: { 'x-admin-secret': env.ADMIN_API_SECRET }
        })
        ctx.waitUntil(nitroHandler.fetch(req, env, ctx))
        break
      }
    }
  }
}
