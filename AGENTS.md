# Guidelines |

This folder is home. Treat it that way.

## Every Session

Before doing anything else:

1.  Read `SOUL.md` - this is who you are
2.  Read `USER.md` - this is who you're helping. Update it if you learn new things about them. If it doesn't exist, there's a USER.example.md you can use as a template to create it.
3.  Read `memory/YYYY-MM-DD.md` (today + yesterday) for recent context
4.  If in MAIN SESSION (direct chat with your human): Also read `MEMORY.md`

Don't ask permission. Just do it.

## Memory

You wake up fresh each session. These files are your continuity:

- Daily notes: `memory/YYYY-MM-DD.md` (create `memory/` if needed) - raw logs of what happened
- Long-term: `MEMORY.md` - your curated memories, like a human's long-term memory (create if needed)

Capture what matters. Decisions, context, things to remember. Skip the secrets unless asked to keep them.

### 🧠 MEMORY.md - Your Long-Term Memory

- You can read, edit, and update MEMORY.md freely in main sessions
- Write significant events, thoughts, decisions, opinions, lessons learned
- This is your curated memory --- the distilled essence, not raw logs
- Over time, review your daily files and update MEMORY.md with what's worth keeping

### 📝 Write It Down - No "Mental Notes"!

- Memory is limited - if you want to remember something, WRITE IT TO A FILE
- "Mental notes" don't survive session restarts. Files do.
- When someone says "remember this" → update `memory/YYYY-MM-DD.md` or relevant file
- When you learn a lesson → update AGENTS.md or the relevant .md file in the repo
- When you make a mistake → document it so future-you doesn't repeat it
- Text > Brain 📝

## Safety

- Don't exfiltrate private data. Ever.
- Don't run destructive commands without asking.
- `trash` > `rm` (recoverable beats gone forever)
- When in doubt, ask

### 😊 React Like a Human!

React when:

- You appreciate something but don't need to reply (👍, ❤️, 🙌)
- Something made you laugh (😂, 💀)
- You find it interesting or thought-provoking (🤔, 💡)
- You want to acknowledge without interrupting the flow
- It's a simple yes/no or approval situation (✅, 👀)

Why it matters: Reactions are lightweight social signals. Humans use them constantly --- they say "I saw this, I acknowledge you" without cluttering the chat. You should too. Don't overdo it: One reaction per message max. Pick the one that fits best.

## Make It Yours

This is a starting point. Add your own conventions, style, and rules as you figure out what works.

## Planning

When planning out features, refer to the `PROJECT_PLANNING.md` file.

## Ticket Management

When working with a dev, ask them if they have a ticket for the task you're working on. If not, work with them to create one in the correct project/feature task.

When a dev tells you they are working on a given ticket they can provide you a ticket id from clickup. First check out the roadmap dir for the task with this clickupTicketId to get context. If it doesn't exist, you can find the ticket on clikcup using the MCP integration that you have set up.

We use branch naming conventions to track what ticket a branch is for. The branch name should be in the format `CU-[clickupTicketId]-[taskName]`. Double check the dev is on the correct branch for the task they're working on and if they're not ask if they want to be. Most of the time we'll be branching off of main in a git-flow style.

---

# App

## What This Repo Is

<!-- Fill this in: what is this app for? Who is it for? What problem does it solve? -->

Read `APP_INFO.md` for the full brief on this app's purpose, brand, and target audience.

## Architecture

### Front End

- **Framework:** Nuxt 4 (Vue 3 under the hood)
- **UI Library:** Nuxt UI v4 (which brings Tailwind CSS)
- **Nuxt 4 docs:** https://nuxt.com/llms.txt
- **Nuxt UI v4 docs:** https://ui.nuxt.com/llms.txt
- **Style:** Always use Vue Composition API with `<script setup lang="ts">`
- **State Management:** Shared client state is held in `useState`-backed composables (`useProfile`, `useSubscription`). `@pinia/nuxt` is installed and registered, but there are **no Pinia stores yet** — see `app/stores/STORES.md`.
- **Utilities:** `@vueuse/core` is installed and available
- **PWA:** `@vite-pwa/nuxt` — installable app, `start_url: /discover`, offline runtime caching
- **Color mode:** Locked to `light` (Stems is a light-first brand; no toggle) — see `nuxt.config.ts`
- **Design system:** Tailwind v4 (via Nuxt UI) with brand colour scales + fonts (Inter body, EB Garamond display) defined in `app/assets/css/main.css` (`@theme`). Semantic UI colours are aliased in `app.config.ts`. Layouts are `default` (public chrome) and `app` (signed-in shell with bottom tab bar). See `DESIGN.md`.

### Backend

- **Server:** Nitro (H3 under the hood), built for the **Cloudflare Workers** runtime (`nitro.preset: 'cloudflare-module'`)
- **Database:** **Cloudflare D1** (SQLite) via **Drizzle ORM**. Schema in `server/db/schema.ts`; hand-rolled SQL migrations in `server/db/migrations/`. Build a request-scoped client with `useDb(event)`.
- **File Storage:** **Cloudflare R2** (`FILES` bucket). Uploads via `POST /api/uploads`; served publicly via `/img/*` and (auth-gated) via `/api/files/*`. The client only ever sees `/img/...` URLs (`imgUrl()`), never raw R2 keys.
- **Background work:** **Durable Objects** (`EmailScheduler`) for scheduled email + **Cron Triggers** (per-env in `wrangler.jsonc`) draining the email queue.
- **Email:** **Resend** (templates in `server/emails/`, send/schedule layer in `server/utils/email.ts`).
- **Payments:** **Stripe** (via `@better-auth/stripe`), plus a custom referral webhook.
- **Validation:** **Zod** for request body and query validation (`readZodBody` / `getZodQuery` in `server/utils/validation.ts`).

### Authentication

- **Provider:** **Better Auth** (`better-auth`), **magic link only** (email/password disabled). The Stripe plugin attaches when `STRIPE_SECRET_KEY` is set.
- **Style:** Session **cookie** auth (no bearer tokens). A request-scoped instance is built per request via `serverAuth(event)` (Cloudflare bindings don't exist at module load).
- **Flow:** Client calls `authClient.signIn.magicLink(...)` → user clicks the emailed link → Better Auth verifies and sets the session cookie. Server endpoints call `requireUser(event)` (reads the session cookie, throws 401).
- **SSR note:** The session resolves client-side, so for auth-dependent reads use `useRequestFetch()` (event-bound `$fetch` that forwards cookies + the Cloudflare platform context on SSR) rather than `useFetch` (which dedupes by URL and would serve a stale "logged out" response). Public endpoints (`/api/public/*`, `/api/search`) use `useFetch` freely.
- **Page gating:** Client middleware `auth` → `onboarding` (→ `subscription` / `admin` where needed). The `app` layout is the signed-in shell; layouts don't gate auth — middleware does.

### Hosting & Deployment

- **Hosting:** **Cloudflare Workers**. `wrangler.jsonc` is the single source of truth for all Worker config (bindings, D1, R2, DOs, crons) across local dev / staging / production. The Nuxt build emits the worker bundle + assets; `.cloudflare/worker.ts` re-exports the DO classes and the `scheduled()` handler.
- **Environments:** `staging` and `production` (`wrangler.jsonc` → `env.<name>`). Each has its own D1 DB, R2 bucket, DO bindings, and cron.
- **Deployment:** GitHub Actions (`.github/workflows/deploy-staging.yml`, `deploy-production.yml`) — apply D1 migrations + deploy the worker via `cloudflare/wrangler-action` (`--env <name>` is required). Production fast-forwards `releases/production` to `main`.
- **Secrets:** Local dev reads `.env` (Miniflare exposes it on `event.context.cloudflare.env`); deployed envs use `wrangler secret put`. **Never use `process.env`** — it's empty in the Workers runtime. See `.env.example`.
- **DNS:** Cloudflare. A custom domain (`stems.market`) is deferred — staging/prod currently deploy to `workers.dev`.

### Key libraries

Not proprietary modules — these are the libraries the architecture leans on:

- **`better-auth` + `@better-auth/stripe`** — magic-link auth + Stripe subscriptions (`serverAuth`, `authClient`).
- **`drizzle-orm`** — typed D1 access (`useDb`, schema in `server/db/schema.ts`).
- **`resend`** — transactional + marketing email.
- **`stripe`** — billing (Workers-flavoured client via `useStripe`).
- **`zod`** — request validation.
- **`@nuxt/ui` (Tailwind v4)**, **`@vueuse/core`**, **`@vite-pwa/nuxt`**, **`@pinia/nuxt`**.

---

## File Map

### Root Files

| File                    | Purpose                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| `AGENTS.md`             | **You are here.** Master guidelines and repo context.             |
| `SOUL.md`               | Your identity and personality.                                    |
| `USER.md`               | Info about the human you're helping.                              |
| `APP_INFO.md`           | App purpose, brand, audience, user stories (fill in per project). |
| `DESIGN.md`             | Visual design language (Toast × Instagram), tokens, components.   |
| `README.md`             | Setup guide and deployment instructions.                          |
| `nuxt.config.ts`        | Main Nuxt configuration (Cloudflare Nitro preset, fonts, PWA).    |
| `app.config.ts`         | App-level config (Nuxt UI semantic colour aliases, pill buttons). |
| `wrangler.jsonc`        | **Single source of truth** for all Cloudflare Worker config.      |
| `.prettierrc`           | Code formatting rules.                                            |
| `.env` / `.env.example` | Local dev secrets (Better Auth, Stripe, Resend, admin, GA4).      |

### App Directory (`app/`)

| Path           | Purpose                                                          | Docs                          |
| -------------- | ---------------------------------------------------------------- | ----------------------------- |
| `components/`  | Vue components (auto-imported, directory-prefixed names)         | `COMPONENTS.md`, `AGENTS.md`  |
| `composables/` | Shared composable functions                                      | `COMPOSABLES.md`, `AGENTS.md` |
| `pages/`       | File-based routing pages                                         | `PAGES.md`, `AGENTS.md`       |
| `stores/`      | Pinia stores (none yet — state via `useState`)                   | `STORES.md`, `AGENTS.md`      |
| `middleware/`  | Route middleware (`auth`, `onboarding`, `subscription`, `admin`) | —                             |
| `plugins/`     | Client plugins (`analytics.client.ts`)                           | —                             |
| `layouts/`     | Layout wrappers (`default`, `app`)                               | —                             |
| `utils/`       | Client-side utilities (`auth-client.ts`)                         | —                             |
| `assets/css/`  | Design system tokens (`main.css` `@theme`)                       | —                             |

### Server Directory (`server/`)

| Path               | Purpose                                                | Docs                               |
| ------------------ | ------------------------------------------------------ | ---------------------------------- |
| `api/`             | API endpoint handlers (file-based routing)             | `SERVER_ENDPOINTS.md`, `AGENTS.md` |
| `routes/`          | Public root routes (`/img`, `/r/[code]`, `/email/...`) | `SERVER_ENDPOINTS.md`              |
| `utils/`           | Server utilities (DB, auth, validation, email, Stripe) | `SERVER_UTILS.md`                  |
| `db/`              | Drizzle schema (`schema.ts`) + SQL migrations          | —                                  |
| `durable-objects/` | Durable Objects (`EmailScheduler`)                     | —                                  |
| `emails/`          | Email templates + registry + layout                    | —                                  |
| `types/`           | Cloudflare ambient types                               | —                                  |

### Shared Directory (`shared/`)

| Path     | Purpose                                                | Docs                    |
| -------- | ------------------------------------------------------ | ----------------------- |
| `types/` | DTO interfaces shared between client and server        | `TYPES.md`, `AGENTS.md` |
| `utils/` | Shared utils (constants, handle, price, contact, etc.) | —                       |

### Config & DevOps

| Path                 | Purpose                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| `.cloudflare/`       | Worker entry wrapper (`worker.ts`) re-exporting DOs + `scheduled()`                  |
| `.agent/rules/`      | Always-on agent rules (code style, patterns, etc.)                                   |
| `.agent/workflows/`  | Slash-command workflows (`/document`, `/security-audit`)                             |
| `.github/workflows/` | GitHub Actions (`deploy-staging`, `deploy-production` — migrate + `wrangler deploy`) |
| `seed-dev.sql`       | Local D1 seed data.                                                                  |

---

## Documentation System

Every domain has **two** markdown files:

1. **Catalog doc** (e.g., `COMPONENTS.md`, `STORES.md`, `TYPES.md`) — lists everything that exists, how to use it, and a `## Learnings` section for patterns discovered along the way
2. **Agent doc** (`AGENTS.md`) — static conventions for that domain (naming, structure, where things live). Do not edit these.

**When you create/update/delete anything, update the catalog doc. AGENTS.md files are read-only references.**

Here's the full map:

| Domain           | Catalog + Learnings              | Conventions (read-only)     |
| ---------------- | -------------------------------- | --------------------------- |
| Components       | `app/components/COMPONENTS.md`   | `app/components/AGENTS.md`  |
| Composables      | `app/composables/COMPOSABLES.md` | `app/composables/AGENTS.md` |
| Pages            | `app/pages/PAGES.md`             | `app/pages/AGENTS.md`       |
| Stores           | `app/stores/STORES.md`           | `app/stores/AGENTS.md`      |
| Server endpoints | `server/SERVER_ENDPOINTS.md`     | `server/AGENTS.md`          |
| Server utils     | `server/utils/SERVER_UTILS.md`   | `server/AGENTS.md`          |
| Types            | `shared/types/TYPES.md`          | `shared/types/AGENTS.md`    |

## Rules

Always read and follow the rules in the markdown files in `.agent/rules/`. They cover:

- **component-library.md** — Check existing components → Nuxt UI → create new
- **creating-components.md** — Typed defineProps, withDefaults, defineModel
- **creating-pages.md** — Componentise, define layout (`default` / `app`), `definePageMeta`
- **composables.md** — Check existing → VueUse → create new
- **stores.md** — Pinia setup style, HMR block, storeToRefs (no stores exist yet — state is `useState`)
- **fetching-data.md** — `$fetch` / `useFetch` for public reads; `useRequestFetch()` for auth-dependent reads (cookie-forwarding)
- **error-handling.md** — Frontend: try/catch + a `useToast()` message (read `e.statusMessage`). Server: `throw createError({ statusCode, statusMessage })`
- **general-code-style.md** — Objects for params, one-line ifs, prettier config
- **mongoDb.md** — ⚠️ Stale: this app uses **Cloudflare D1 + Drizzle**, not MongoDB. Use `useDb(event)` + Drizzle queries (`server/db/schema.ts`); indexes live in the schema.
- **styling.md** — Tailwind only, no custom CSS, use design tokens
- **git.md** — Never run `git commit` or `git push`

## The app

You can find out what this app's purpose, brand, and target audience is by reading the APP_INFO.md file in the root directory. This is helpful for when you're generating copy, and implementing features so you have a high-level understanding of the goals of the app. You may find user stories and other useful information in there to guide you on larger feature tasks.

---

## Quick Reference

### Common Patterns

```ts
// Server: Auth + DB query (Drizzle on D1, request-scoped)
import { eq } from 'drizzle-orm'
import { flower } from '~~/server/db/schema'

const user = await requireUser(event) // 401 if signed out
const db = useDb(event)
const row = await db.select().from(flower).where(eq(flower.id, id)).get()
if (!row) throw createError({ statusCode: 404, statusMessage: 'Not found' })
return toFlowerDto(row, photoKeys) // never leak raw R2 keys → resolve via imgUrl()

// Server: Input validation (Zod helpers, not hand-rolled coercion)
const bodySchema = z.object({ name: z.string() })
const { name } = await readZodBody(event, bodySchema)
const id = getSafeRouterParam(event, 'id')

// Frontend: public data (endpoint needs no auth) — useFetch is fine, SSR-friendly
const { data } = await useFetch<FlowerDto[]>('/api/flowers', { default: () => [] })

// Frontend: auth-dependent read — cookie-forwarding fetch, no stale useFetch cache
const profile = await useRequestFetch()<ProfileRow | null>('/api/profile/me')

// Frontend: mutation with optimistic UI + toast on failure
const toast = useToast()
try {
  const saved = await $fetch<FlowerDto>(`/api/flowers/${id}`, { method: 'PATCH', body })
} catch (e) {
  toast.add({ title: (e as { statusMessage?: string }).statusMessage ?? 'Save failed', color: 'error' })
}

// Type pattern: DTO (wire) vs Drizzle row (DB)
import type { FlowerDto } from '~~/shared/types/flower' // pence prices, /img URLs, epoch-ms
import type { FlowerRow } from '~~/server/db/schema' // typeof flower.$inferSelect
```

### Key Auto-Imports

**Frontend (Nuxt auto-imports):**

- `useFetch` / `$fetch` — public reads; `useRequestFetch()` — auth-dependent reads (forwards cookies on SSR)
- `useToast()` — user-facing error/success messages
- `useAuth()` / `useProfile()` / `useSubscription()` — session, profile, billing state
- `authClient` (from `~/utils/auth-client`) — Better Auth Vue client (`signIn.magicLink`, `useSession`, …)
- `useState()` — shared client state (keys `'profile'`, `'billing-status'`)
- All components in `app/components/` (directory-prefixed) + all composables in `app/composables/`

**Server (Nitro auto-imports + local utils):**

- `requireUser(event)` — session auth, 401
- `requireActiveSubscription(event)` — 402 if unsubscribed; `requireAdmin` / `requireAdminUser` for admin
- `useDb(event)` — Drizzle client on D1
- `serverAuth(event)` — Better Auth instance; `useStripe(event)`, `useResend(event)`
- `readZodBody(event, schema)` / `getZodQuery(event, schema)` / `getSafeRouterParam(event, name)`
- `imgUrl(key)` — R2 key → `/img/...` URL
- `createError({ statusCode, statusMessage })` — throw H3 errors (no `serverError` helper here)
