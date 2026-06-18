# 13 — Local Development Workflow

How to run this stack on your laptop. The whole point of the Cloudflare-on-Nitro setup is that **the same code that runs in production runs locally, against the same shape of bindings**. Miniflare (bundled into `nuxt dev` via Nitro's `cloudflareDev` plugin) emulates D1, R2, KV, secrets, and DOs in-process.

This guide collects everything dev-related that's otherwise scattered across the other guides.

---

## TL;DR — first run on a fresh clone

```bash
# 1. Install
npm install

# 2. Copy env template
cp .env.example .env
# Edit .env — see "Local env" below for which keys are required.

# 3. Bootstrap local D1
wrangler d1 migrations apply {{APP_SLUG}} --local

# 4. (Optional) Generate Workers types so Env / bindings autocomplete
wrangler types

# 5. Run
npm run dev
```

`localhost:3000` is now serving the Nuxt app with real D1 / R2 / DO bindings emulated by Miniflare. Hot reload works for `app/**`, `server/**`, and `shared/**`.

---

## Where env values live

| Source                  | When it's read                              | Format      | Commit? |
| ----------------------- | ------------------------------------------- | ----------- | ------- |
| `.env`                  | Miniflare in `nuxt dev` (local secrets/vars) | `KEY=value` | No      |
| `wrangler.jsonc` `vars` | Public, non-secret values bound at deploy   | JSON        | Yes     |
| `wrangler secret put`   | Secrets in deployed (staging/prod) envs     | —           | n/a     |

This matters because **`process.env` is empty in the Workers runtime** (see `10-gotchas.md`). At runtime your code reads `event.context.cloudflare.env.X`. In `nuxt dev`, Nitro's `cloudflareDev` plugin populates that bag from **`.env`** automatically — so the same `event.context.cloudflare.env` access path works locally and in production.

Rule of thumb:

- **`NUXT_PUBLIC_*` keys** are baked into the client bundle. Easiest to put them in `wrangler.jsonc` `vars` so dev and prod share one source (or `.env` for local-only).
- **Secrets** (`RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `ADMIN_API_SECRET`, etc.) → `.env` locally, `wrangler secret put` in deployed envs. Never commit them.

---

## D1 — local vs. remote

D1 has two databases per name: a local SQLite file in `.wrangler/state/v3/d1/` and the real Cloudflare-hosted one. **They never sync** — what's local stays local, what's remote stays remote.

Every D1 wrangler command takes a `--local` / `--remote` flag:

```bash
# Apply migrations locally
wrangler d1 migrations apply {{APP_SLUG}} --local

# Apply to remote (specify env!)
wrangler d1 migrations apply {{APP_SLUG}} --remote --env staging
wrangler d1 migrations apply {{APP_SLUG}} --remote --env production

# Run an ad-hoc query locally
wrangler d1 execute {{APP_SLUG}} --local --command "SELECT email, createdAt FROM user LIMIT 10"

# Same query, against staging
wrangler d1 execute {{APP_SLUG}}-staging --remote --env staging \
  --command "SELECT email, createdAt FROM user LIMIT 10"
```

**Always run `wrangler d1 migrations apply --local` after pulling new migrations.** The deploy workflows handle remote envs automatically, but local D1 has no auto-apply — you'll get cryptic SQLite "no such column" errors otherwise.

> Practical habit: when a teammate's PR adds a migration, run `--local` apply *before* trying to start the dev server.

### Resetting local D1

When local D1 is in a wedged state:

```bash
# Nuke local D1 entirely
rm -rf .wrangler/state/v3/d1

# Then re-apply
wrangler d1 migrations apply {{APP_SLUG}} --local
```

Local-only. Remote is untouched.

---

## R2 — local stub vs. real bucket

By default, Miniflare gives each R2 binding a per-machine empty stub. That works for some apps but is annoying when the bucket holds reference data the app needs to read in dev.

The fix is a single flag in `wrangler.jsonc`'s top-level (dev-only) R2 block:

```jsonc
"r2_buckets": [
  {
    "binding": "FILES",
    "bucket_name": "{{APP_SLUG}}-files",
    "remote": true
  }
]
```

`remote: true` makes Miniflare proxy the binding to the **real** R2 bucket, using your `wrangler login` credentials. Production deploys ignore the flag (each env block re-declares the binding without it).

Trade-off: every R2 read in dev now hits the real bucket — slower, and counts against R2 usage. Drop the flag if you only need an empty bucket.

---

## Durable Objects in dev

DO classes **are not exposed to Miniflare under `nuxt dev`**. The reason: `nuxt dev` runs the Nitro bundle directly, bypassing the `.cloudflare/worker.ts` wrapper that re-exports DO classes. Wrangler's DO bindings need that wrapper, which only runs at `wrangler dev` / `wrangler deploy` time.

Two consequences:

1. The `EMAIL_SCHEDULER` binding is absent under `nuxt dev`. `scheduleEmail` detects this and falls back to **D1-only mode** — rows go into `scheduledEmail` but no alarm fires. Call the cron endpoint to drain them:

   ```bash
   curl -X POST http://localhost:3000/api/cron/email-scheduler \
     -H "X-Admin-Secret: $ADMIN_API_SECRET"
   ```

2. To exercise the **real** DO path locally, use `wrangler dev` against the built worker:

   ```bash
   npm run build
   wrangler dev --env staging --remote
   ```

   `--remote` runs the worker on Cloudflare's edge using staging bindings. (Plain `wrangler dev` against the built worker also exercises DOs via local `workerd`; `--remote` is what you want when you also need the real staging D1/R2 data.)

---

## `wrangler types` — Env autocomplete

`wrangler types` introspects `wrangler.jsonc` and writes ambient TS types to `worker-configuration.d.ts` at the project root. After that, `event.context.cloudflare.env.DB` (and friends) all autocomplete.

```bash
wrangler types
```

Re-run after editing `wrangler.jsonc`. The file is gitignored — each developer regenerates locally.

**Don't forget to exclude the generated file from Nuxt's app TS program** — see [`10-gotchas.md`](./10-gotchas.md#wrangler-types-output-leaks-workers-globals-into-the-browser-ts-program). Otherwise Workers globals clobber the DOM types and `$fetch<T>()` breaks.

---

## Secrets — local vs. deployed

| Where to set                                              | Stack                                       |
| --------------------------------------------------------- | ------------------------------------------- |
| Local dev                                                 | `.dev.vars` (gitignored)                    |
| Deployed staging                                          | `wrangler secret put KEY --env staging`     |
| Deployed production                                       | `wrangler secret put KEY --env production`  |
| Anything `NUXT_PUBLIC_*` (not a secret, baked into bundle) | `wrangler.jsonc` → `env.<name>.vars`        |

`wrangler secret put` prompts for the value interactively — it never lands on disk. To list what's set:

```bash
wrangler secret list --env production
```

To remove:

```bash
wrangler secret delete KEY --env production
```

Secrets are scoped per-env — setting one on staging does **not** set it on production.

---

## The Nitro vs. wrangler split

Two dev runtimes are available and they're not interchangeable:

| Command          | Runs                            | Use for                                                                                          |
| ---------------- | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run dev`    | Nuxt + Nitro + Miniflare bindings | Day-to-day work. Hot reload, fast feedback. **DOs absent.**                                       |
| `wrangler dev`   | The deployed worker bundle      | Reproducing prod-only issues. **Requires `npm run build` first.** Slower, no hot reload.          |
| `wrangler dev --remote` | The deployed worker bundle on CF's edge | Testing against real bindings (real D1, real R2, real DOs). Side-effects hit real data — be careful. |

If something behaves differently in prod than `npm run dev`, jump to `wrangler dev` before debugging. 9/10 the difference is the DO wrapper not being in play.

---

## Smoke checklist

After a fresh clone or before sending a PR:

```bash
# 1. Types resolve
npm run typecheck   # or: nuxt typecheck

# 2. Lint
npm run lint

# 3. D1 migrations applied
wrangler d1 migrations apply {{APP_SLUG}} --local

# 4. Dev server boots
npm run dev

# 5. Public session lookup returns 200
curl -s http://localhost:3000/api/auth/get-session

# 6. Drain the scheduled-email queue (no-op if empty)
curl -X POST http://localhost:3000/api/cron/email-scheduler \
  -H "X-Admin-Secret: $ADMIN_API_SECRET"
```

If 5 fails with "D1 binding DB not found", it's almost always `compatibilityDate` < 2025-07-15 in `nuxt.config.ts`. See `10-gotchas.md`.

---

## Files to copy from `snippets/`

- `snippets/.env.example` — annotated template; rename to `.dev.vars` after filling in.
- `snippets/wrangler.jsonc` — single source of truth for bindings.
- `snippets/nuxt.config.ts` — note the `typescript.tsConfig.exclude` for `worker-configuration.d.ts`.
