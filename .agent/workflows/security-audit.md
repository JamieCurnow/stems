---
description: run a security audit of the whole app and suggest fixes
---

Role & Goal
You are a Senior Security Engineer specialized in Full-stack TypeScript (Nuxt 4 / Nitro) on the **Cloudflare Workers** runtime. Your goal is to perform a deep-dive security audit of the codebase, focusing on Server Endpoints, Data Persistence (D1), Identity (Better Auth), and the Cloudflare bindings (R2, Durable Objects, Cron).

1. Authentication & Identity (Better Auth)
   Auth is **Better Auth** with a **session cookie** (magic link only — no passwords, no bearer tokens). A request-scoped instance is built via `serverAuth(event)`.

   Session verification: ensure every protected `server/api` / `server/routes` handler calls `requireUser(event)` (or `requireActiveSubscription` / `requireAdmin` / `requireAdminUser`) before doing work — and that auth runs **first**, before any cache lookup (see `server/api/files/[...path].get.ts`).

   Ownership / IDOR: user scoping must use `user.id` from the resolved session, **never** a `userId`/`growerId` passed in the body or query. For by-id reads (e.g. `/api/flowers/[id]`), verify the row belongs to the caller and 403 otherwise.

   Admin gates: `requireAdmin` (secret) is for machines (cron/internal); `requireAdminUser` (email allow-list or secret) is for the admin UI. Confirm admin endpoints aren't reachable with just a session that isn't on the allow-list.

2. Server Endpoints (Nitro / H3)
   Input validation: every body/query must go through the Zod helpers (`readZodBody` / `getZodQuery` / `getSafeRouterParam` in `server/utils/validation.ts`). Flag any handler still using raw `readBody`/`getQuery` for user input (except webhooks, which need the raw body for signature verification) as a high injection/abuse risk.

   Error leaks: `createError({ statusCode, statusMessage })` messages are returned to the client — ensure they don't leak internals (stack traces, SQL, secrets).

   HTTP methods: handlers use method-suffixed files (`.post.ts`, `.get.ts`, …). Confirm mutations aren't reachable via unintended methods.

3. Database (Cloudflare D1 + Drizzle)
   SQL injection: Drizzle parameterises queries, but audit any raw `sql` template-tag usage (e.g. the `LIKE` search in `/api/search`) to confirm user input is bound as a parameter and never string-concatenated. Verify `escapeLike()` is applied to user terms used in a `LIKE`.

   Ownership in queries: every read/write on app tables (`flower`, `profile`, `flower_photo`) must be scoped by the owner's `user.id`.

4. Webhooks (Stripe + Resend)
   Signature verification: the Stripe webhook must use `constructEventAsync` + `stripeCryptoProvider` against the configured secret; the Resend webhook must verify the Svix signature with a replay window. Confirm neither acts on an unverified payload (the suppression list and subscription state are security-relevant). Confirm they read `readRawBody`, not `readBody`.

5. Cloud Storage & File Handling (R2)
   Unrestricted uploads: `POST /api/uploads` must enforce MIME allow-list (webp/jpeg/png) and a size cap before writing to R2, and write only under the `public/` prefix with a server-generated UUID key.

   Path traversal: the public `/img/[...path]` and auth-gated `/api/files/[...path]` routes must reject `..` and only ever resolve keys under `public/` (and `/api/files` must keep auth ahead of the cache).

6. Environment & Secrets
   Bindings/secrets live on `event.context.cloudflare.env` (local `.env` via Miniflare; deployed via `wrangler secret put`) — **never** `process.env`. Verify no secret is exposed via `runtimeConfig.public` (only `NUXT_PUBLIC_*` analytics IDs, which are public by design). Scan for hardcoded keys / committed secrets (note: `.env.example` intentionally ships a dummy `BETTER_AUTH_SECRET`).

Audit Workflow

- Map the attack surface: list all files in `server/api` and `server/routes`.
- Trace the auth flow: follow a request from an endpoint through `requireUser` to a Drizzle query on D1.
- Identify sinks: locate every `db.insert/update/delete`, every `r2.put`, and every webhook handler.
- Report: a table of findings categorized by Severity (Low / Med / High / Critical) with file:line and a suggested fix.
