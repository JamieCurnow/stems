# 09 — Deployment + Multi-Env + CI/CD

Three completely isolated environments — dev, staging, production. Three workers, three D1 databases, three sets of secrets. A staging session cannot authenticate against prod and vice versa. That's the whole point.

---

## Environments at a glance

| Env        | Where it runs                 | DB                          | Secrets path                                       | URL                          |
| ---------- | ----------------------------- | --------------------------- | -------------------------------------------------- | ---------------------------- |
| **Dev**    | `nuxt dev` (Miniflare)        | Local SQLite in `.wrangler/`| `.env`                                             | `http://localhost:3000`      |
| **Staging**| Worker `{{APP_SLUG}}-staging` | D1 `{{APP_SLUG}}-staging`   | `wrangler secret put X --env staging`              | `staging.{{APP_DOMAIN}}` or `*.workers.dev` |
| **Prod**   | Worker `{{APP_SLUG}}`         | D1 `{{APP_SLUG}}`           | `wrangler secret put X --env production`           | `{{APP_DOMAIN}}`             |

`wrangler.jsonc` carries everything declarative (bindings, vars, routes); wrangler secrets carry secrets.

---

## Provisioning a new env (manual)

```bash
# 1. Create the D1 database
wrangler d1 create {{APP_SLUG}}-staging
# Output: { "database_id": "abc123-..." }
# Paste that UUID into wrangler.jsonc → env.staging.d1_databases[0].database_id

# 2. Apply migrations to the new D1
wrangler d1 migrations apply {{APP_SLUG}}-staging --remote --env staging

# 3. Generate + set the auth secret
npx better-auth secret    # prints a fresh 32-byte hex string
echo -n '<secret>' | wrangler secret put BETTER_AUTH_SECRET --env staging

# 4. Set the URL
echo -n 'https://staging.{{APP_DOMAIN}}' | wrangler secret put BETTER_AUTH_URL --env staging

# 5. Set Stripe + Resend + admin secrets
echo -n 'sk_test_...'        | wrangler secret put STRIPE_SECRET_KEY --env staging
echo -n 'price_...'          | wrangler secret put STRIPE_PRICE_ID --env staging
echo -n 'whsec_...'          | wrangler secret put STRIPE_WEBHOOK_SECRET --env staging
echo -n 're_...'             | wrangler secret put RESEND_API_KEY --env staging
echo -n '<rand-hex-32>'      | wrangler secret put ADMIN_API_SECRET --env staging

# 6. First deploy
wrangler deploy --env staging
```

> Or set secrets via the Cloudflare dashboard: Workers → worker → Settings → Variables and Secrets. Mark sensitive ones as Secret (write-only); plain text vars can live in `wrangler.jsonc` under `env.<name>.vars`.

---

## Provisioning via the internal CLI (optional)

If you want this scripted, the original codebase shipped an internal CLI (`scripts/cli.ts`) built on [`citty`](https://github.com/unjs/citty) + `@clack/prompts`. The subcommand surface:

| Command  | What it does                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| `init`   | Provision a new env: create D1, write env block in `wrangler.jsonc`, apply migrations, set BETTER_AUTH secrets. Idempotent. |
| `destroy`| Tear down an env: delete the Worker, delete the D1 (irreversible!), remove the env block. Type-to-confirm.    |
| `rotate` | Replace `BETTER_AUTH_SECRET` on a deployed env. Forces every active session to re-authenticate.                |
| `list`   | List every env defined in `wrangler.jsonc` with worker name, D1, and route. `--remote` cross-checks Cloudflare. |

It's nice-to-have. The manual wrangler commands above do the same job; the CLI just packages them up.

Key insight from that tooling: `wrangler deploy --env <name>` does **not** merge top-level fields into the env block, so each env block has to be self-contained. The CLI's `init` builds the block from three layers, in increasing priority:

1. **Inherited from top-level** — `r2_buckets`, `vars`, `kv_namespaces`, `durable_objects`, `queues`. Dev-only flags like `remote: true` on R2 are stripped.
2. **Existing env block** — anything already there that init doesn't manage. Manual additions are preserved.
3. **Init-managed fields** — `name`, `workers_dev`, `preview_urls`, `d1_databases`, `routes`. Always overridden.

If you want this script, see the `scripts/` directory in the source repo it was extracted from. Or just keep using the manual commands — the multi-env config is the actual value, not the wrapper.

---

## Secret hygiene

```bash
# Rotate BETTER_AUTH_SECRET in production (invalidates every active session)
npx better-auth secret    # generate
echo -n '<new>' | wrangler secret put BETTER_AUTH_SECRET --env production

# Verify what's set on an env
wrangler secret list --env production
```

When to rotate:

- The secret leaked (committed to git, pasted in a Slack thread, exposed in a log dump) — rotate immediately.
- Periodic hygiene on production (every 6–12 months in security-conscious shops).
- After firing someone with prod access.

User data, account rows, password hashes (if any) are unaffected. Existing sessions fail signature verification → forced logout → users sign in again with the same credentials.

---

## GitHub Actions

Two workflows under `.github/workflows/`:

### `deploy-staging.yml` — push to main → deploy staging

```yaml
name: Deploy staging
on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-staging
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: staging
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          NODE_OPTIONS: --max-old-space-size=6144
      - name: Apply D1 migrations (staging)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          # `--env staging` is REQUIRED — without it wrangler resolves the DB
          # via the top-level d1_databases binding (placeholder UUID) and the
          # migration API call fails.
          command: d1 migrations apply {{APP_SLUG}}-staging --remote --env staging
      - name: Deploy worker (staging)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env staging
```

### `deploy-production.yml` — manual dispatch with reviewer gate

```yaml
name: Deploy production
on:
  workflow_dispatch:

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v6
        with:
          ref: main
          fetch-depth: 0
      - name: Fast-forward releases/production to main
        run: |
          git config user.name 'github-actions[bot]'
          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
          if git ls-remote --exit-code --heads origin releases/production >/dev/null; then
            git fetch origin releases/production:releases/production
            git checkout releases/production
            # Refuse to deploy if releases/production has commits not in main —
            # someone would have hot-fixed prod directly. Reconcile manually.
            git merge --ff-only main
          else
            git checkout -B releases/production main
          fi
          git push origin releases/production
      - uses: actions/setup-node@v6
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run build
        env: { NODE_OPTIONS: --max-old-space-size=6144 }
      - name: Apply D1 migrations (production)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: d1 migrations apply {{APP_SLUG}} --remote --env production
      - name: Deploy worker (production)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env production
```

### One-time setup

1. **Disconnect Cloudflare's "Workers Builds" Git integration** if it's enabled (Cloudflare dashboard → your worker → Settings → Builds → disconnect). Otherwise it races the GitHub Actions deploys.

2. **Create a Cloudflare API token** (Cloudflare dashboard → My Profile → API Tokens → Create Token → Custom):
   - Account → Workers Scripts → Edit
   - Account → D1 → Edit
   - Account → Account Settings → Read
   - Zone → Workers Routes → Edit (only if using custom domain routes)
   - Account resources: limit to the target account.

3. **Add GitHub repo secrets** (Settings → Secrets and variables → Actions → New secret):
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

4. **Create GitHub Environments** (Settings → Environments):
   - `staging` — no protection rules.
   - `production` — tick "Required reviewers" and add yourself. The prod workflow won't run without an approval click.

### Day-to-day flow

- Push to `main` → staging deploys automatically. Watch the Actions tab.
- When ready to promote: Actions → "Deploy production" → Run workflow → confirm. Approve in the Environments prompt. Done.

### Rollback

- **Code rollback** — `git revert <commit>` on `main`, push. Staging deploys the revert. Promote to prod.
- **Emergency** — `wrangler rollback --env production` reverts the worker to the previous deploy without touching git. Does NOT roll back D1 migrations (they're forward-only by design). If the broken deploy ran a destructive migration, you need a forward-fix migration; D1's Time Travel (point-in-time recovery up to 30 days) is your last-resort restore.
- **Never hot-fix prod directly.** The `--ff-only` guard on `releases/production` will refuse to deploy if it has diverged from `main`. Merge fixes into `main` → fast-forward `releases/production` → promote.

### When NOT to auto-apply migrations

The migration step in both workflows is forward-only and runs unconditionally. That's safe for additive changes (`CREATE TABLE`, `ALTER TABLE ADD COLUMN`). It is **not** safe for:

- `DROP TABLE` / `DROP COLUMN`
- column renames (D1 implements them as drop+recreate)
- non-nullable columns added to populated tables

For those: temporarily comment out the migration step, run the migration manually (with `wrangler d1 export` first, multi-step backfill, etc.), then re-enable.

---

## Sanity checks

```bash
# What's set on each env?
wrangler secret list --env staging
wrangler secret list --env production

# How many users on each?
wrangler d1 execute {{APP_SLUG}}-staging --remote --command "SELECT count(*) FROM user"
wrangler d1 execute {{APP_SLUG}}         --remote --command "SELECT count(*) FROM user"

# Live logs
wrangler tail --env production
```

`wrangler tail` streams console.log/error + invocation metadata in real time. Pair with the `observability.logs` block in `wrangler.jsonc` for retained logs queryable from the dashboard's Logs tab.

---

## Files to copy from `snippets/`

- `snippets/.github/workflows/deploy-staging.yml`
- `snippets/.github/workflows/deploy-production.yml`
- (Optional) `snippets/scripts/` if you want the internal CLI tooling.
