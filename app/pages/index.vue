<script setup lang="ts">
// Public marketing home for the starter itself. No auth — this is the page a
// developer evaluating the template lands on. The app surface lives behind
// /login → /app. Swap the copy/links here for your own product when you ship.

const repoUrl = 'https://github.com/hiyield/nuxt-cloudflare-starter'

useSeoMeta({
  title: 'Nuxt 4 + Cloudflare starter',
  description:
    'Hiyield’s internal starter for Nuxt 4 on Cloudflare Workers. Auth, billing, email, scheduled jobs, storage, PWA, analytics and CI/CD, already wired up.'
})

const nav = [
  { label: 'Features', to: '#features' },
  { label: 'Stack', to: '#stack' },
  { label: 'Architecture', to: '#architecture' },
  { label: 'Docs', to: '#docs' }
]

// The nine-plus pillars the template ships with. Each maps to a documented
// integration guide and real code under app/ and server/.
const features = [
  {
    icon: 'i-lucide-zap',
    title: 'Edge-native runtime',
    description:
      'Nuxt 4 on the cloudflare-module Nitro preset. Request-scoped bindings, no cold servers, deployed to every Cloudflare data center.'
  },
  {
    icon: 'i-lucide-key-round',
    title: 'Passwordless auth',
    description:
      'Better Auth magic links with sessions in D1. No password hashes to leak — just a one-time link emailed via Resend.'
  },
  {
    icon: 'i-lucide-database',
    title: 'D1 + Drizzle ORM',
    description:
      'Cloudflare’s SQLite at the edge with type-safe Drizzle queries and forward-only migrations applied automatically on deploy.'
  },
  {
    icon: 'i-lucide-credit-card',
    title: 'Stripe billing',
    description:
      'Hosted Checkout, Customer Portal and subscription gating via the Better Auth Stripe plugin — Workers-native crypto and fetch.'
  },
  {
    icon: 'i-lucide-mail',
    title: 'Transactional email',
    description:
      'Plain-TS Resend templates with transactional / product / marketing categories, per-user preferences and one-click unsubscribe.'
  },
  {
    icon: 'i-lucide-alarm-clock',
    title: 'Scheduled jobs',
    description:
      'A Durable Object scheduler fires future-dated work to the second, with retry-with-backoff and prefix-based bulk cancellation.'
  },
  {
    icon: 'i-lucide-folder-lock',
    title: 'R2 file storage',
    description:
      'An auth-gated proxy that serves private objects from R2 with 1 MiB block caching, so range requests and cache hits both work.'
  },
  {
    icon: 'i-lucide-smartphone',
    title: 'Installable PWA',
    description:
      'Service worker, offline page caching and a full icon matrix generated from a single source SVG. Installs land users in the app.'
  },
  {
    icon: 'i-lucide-chart-column',
    title: 'Analytics + consent',
    description:
      'One GTM container drives GA4 plus any pixel you add later, behind Consent Mode v2 with a first-party cookie and a consent banner.'
  },
  {
    icon: 'i-lucide-rocket',
    title: 'CI/CD pipelines',
    description:
      'GitHub Actions deploy staging on push to main and promote to production behind a required-reviewers gate. Migrations run for you.'
  },
  {
    icon: 'i-lucide-gift',
    title: 'Referrals (optional)',
    description:
      'A /r/[code] landing drops a cookie, Checkout applies the promo, and an atomic CAS grant credits the referrer exactly once.'
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Typed end to end',
    description:
      'Strict TypeScript across the SSR boundary, ESLint flat config, and a tsconfig tuned so Workers globals never clobber DOM types.'
  }
]

// Stack pills for the "powered by" strip.
const stack = [
  'Nuxt 4',
  'Cloudflare Workers',
  'D1',
  'Drizzle ORM',
  'Better Auth',
  'Stripe',
  'Resend',
  'Durable Objects',
  'R2',
  'Tailwind v4',
  'Nuxt UI',
  'Pinia'
]

// The integration-guides/ catalog — what ships documented in the repo.
const guides = [
  { n: '01', icon: 'i-lucide-cloud', title: 'Cloudflare setup' },
  { n: '02', icon: 'i-lucide-database', title: 'Database — D1 + Drizzle' },
  { n: '03', icon: 'i-lucide-key-round', title: 'Auth — Better Auth' },
  { n: '04', icon: 'i-lucide-credit-card', title: 'Stripe billing' },
  { n: '05', icon: 'i-lucide-mail', title: 'Email — Resend' },
  { n: '06', icon: 'i-lucide-alarm-clock', title: 'Durable Objects & scheduling' },
  { n: '07', icon: 'i-lucide-folder-lock', title: 'R2 storage' },
  { n: '08', icon: 'i-lucide-smartphone', title: 'PWA setup' },
  { n: '09', icon: 'i-lucide-rocket', title: 'Deployment & CI/CD' },
  { n: '10', icon: 'i-lucide-triangle-alert', title: 'Gotchas' },
  { n: '11', icon: 'i-lucide-chart-column', title: 'Analytics — GTM + GA4' },
  { n: '12', icon: 'i-lucide-timer', title: 'Cron triggers' },
  { n: '13', icon: 'i-lucide-terminal', title: 'Local dev' }
]

// Hero code sample — one handler that touches auth, billing, D1 and the
// Durable Object email scheduler. Most of the starter's value in ~15 lines.
const heroSnippet = `// server/api/projects.post.ts
export default defineEventHandler(async (event) => {
  // Auth + Stripe gate in one call — 402s if the sub lapsed
  const { user } = await requireActiveSubscription(event)

  const db = useDb(event)                       //  D1 + Drizzle, edge-side
  const project = await createProject(db, user, await readBody(event))

  // Follow up in 3 days, fired by a Durable Object
  await scheduleEmail(event, {
    emailId: 'project-tips',
    sendAt: Date.now() + 3 * 86_400_000,
    dedupeKey: \`tips-\${project.id}\`,
    props: { name: project.name }
  })

  return project
})`

// Architecture deep-dive snippets.
const authSnippet = `// app/middleware/auth.ts — page-level gate
export default defineNuxtRouteMiddleware(() => {
  const { loggedIn } = useAuth()
  if (!loggedIn.value) return navigateTo('/login')
})

// server — gate any handler, edge-side
const user = await requireUser(event)`

const emailSnippet = `// Fire it now…
await sendEmail(event, 'welcome', { to: user.email })

// …or schedule it for later, to the second.
await scheduleEmail(event, {
  template: 'trial-ending',
  sendAt: trialEndsAt,
  dedupeKey: \`trial-\${user.id}\`
})

// Trial converted early? Cancel the whole family.
await cancelScheduledEmails({ dedupePrefix: 'trial-' })`
</script>

<template>
  <div class="min-h-dvh bg-default">
    <!-- ───────────────────────── Header ───────────────────────── -->
    <UHeader :ui="{ center: 'hidden lg:flex' }">
      <template #left>
        <NuxtLink to="/" class="flex items-center gap-2.5">
          <span class="logo-mark">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 2 4 9v14l12 7 12-7V9L16 2Z" class="logo-edge" />
              <path d="m9 21 6-11 4 7h-5l-2 4H9Z" class="logo-bolt" />
            </svg>
          </span>
          <span class="text-sm font-semibold tracking-tight leading-none">
            Nuxt&nbsp;+&nbsp;Cloudflare
            <span class="block text-[11px] font-medium text-muted">Starter</span>
          </span>
        </NuxtLink>
      </template>

      <UNavigationMenu :items="nav" variant="link" />

      <template #right>
        <UColorModeButton />
        <UButton
          icon="i-lucide-github"
          color="neutral"
          variant="ghost"
          :to="repoUrl"
          target="_blank"
          aria-label="GitHub repository"
        />
        <UButton label="Sign in" color="neutral" variant="ghost" to="/login" class="hidden sm:inline-flex" />
        <UButton
          label="Use template"
          trailing-icon="i-lucide-arrow-right"
          color="primary"
          :to="repoUrl"
          target="_blank"
        />
      </template>

      <template #body>
        <UNavigationMenu :items="nav" orientation="vertical" class="-mx-2.5" />
        <USeparator class="my-4" />
        <UButton label="Sign in" color="neutral" variant="subtle" to="/login" block class="mb-2" />
        <UButton label="Use this template" color="primary" :to="repoUrl" target="_blank" block />
      </template>
    </UHeader>

    <!-- ───────────────────────── Hero ───────────────────────── -->
    <section class="hero relative overflow-hidden">
      <div class="hero-glow" aria-hidden="true" />
      <UContainer class="relative py-20 sm:py-28">
        <div class="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <UBadge color="neutral" variant="subtle" class="mb-5 rounded-full" size="lg">
              <UIcon name="i-lucide-folder-git-2" class="size-3.5" />
              Internal template · Hiyield
            </UBadge>

            <h1 class="text-pretty text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Nuxt&nbsp;4 + <span class="text-gradient">Cloudflare</span> starter
            </h1>

            <p class="mt-6 max-w-xl text-lg text-muted">
              Our baseline for new Nuxt projects on Cloudflare Workers. Auth, billing, email, scheduled jobs,
              file storage, PWA, analytics and CI/CD are already wired up, so a new client app starts from a
              working foundation instead of an empty repo.
            </p>

            <div class="mt-8 flex flex-wrap items-center gap-3">
              <UButton
                size="xl"
                color="primary"
                trailing-icon="i-lucide-arrow-right"
                :to="repoUrl"
                target="_blank"
              >
                Use this template
              </UButton>
              <UButton size="xl" color="neutral" variant="subtle" icon="i-lucide-book-open" to="#docs">
                Read the docs
              </UButton>
            </div>
          </div>

          <!-- Code window -->
          <div class="code-window">
            <div class="code-chrome">
              <span class="dot dot-red" />
              <span class="dot dot-amber" />
              <span class="dot dot-green" />
              <span class="ml-2 font-mono text-xs text-muted">projects.post.ts</span>
            </div>
            <pre class="code-body"><code>{{ heroSnippet }}</code></pre>
            <div class="code-foot">
              <UIcon name="i-lucide-terminal" class="size-3.5" />
              <span>npm&nbsp;run&nbsp;dev</span>
              <span class="ml-auto inline-flex items-center gap-1.5 text-primary">
                <span class="pulse-dot" /> localhost:3000
              </span>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- ───────────────────────── Stack strip ───────────────────────── -->
    <section id="stack" class="border-y border-default bg-elevated/40">
      <UContainer class="py-10">
        <p class="text-center text-xs font-medium uppercase tracking-widest text-muted">The stack</p>
        <ul class="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-3">
          <li v-for="item in stack" :key="item">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-default bg-default px-3.5 py-1.5 text-sm font-medium"
            >
              <span class="size-1.5 rounded-full bg-primary" />
              {{ item }}
            </span>
          </li>
        </ul>
      </UContainer>
    </section>

    <!-- ───────────────────────── Features ───────────────────────── -->
    <section id="features" class="scroll-mt-20">
      <UContainer class="py-20 sm:py-28">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">What&rsquo;s included</h2>
          <p class="mt-4 text-lg text-muted">
            Twelve building blocks, each with real code and a matching integration guide. Auth and the
            database are the floor; everything else is optional.
          </p>
        </div>

        <UPageGrid class="mt-14">
          <UPageCard
            v-for="f in features"
            :key="f.title"
            :icon="f.icon"
            :title="f.title"
            :description="f.description"
            variant="subtle"
            spotlight
            spotlight-color="primary"
            class="transition-shadow hover:shadow-lg"
          />
        </UPageGrid>
      </UContainer>
    </section>

    <!-- ───────────────────────── Architecture deep-dives ───────────────────────── -->
    <section id="architecture" class="scroll-mt-20 border-t border-default bg-elevated/30">
      <UContainer class="py-20 sm:py-28 space-y-24">
        <!-- Auth -->
        <div class="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <UBadge color="primary" variant="subtle" class="mb-4">Auth</UBadge>
            <h3 class="text-2xl font-semibold tracking-tight sm:text-3xl">
              Passwordless auth, gated both sides
            </h3>
            <p class="mt-4 text-muted">
              Passwordless magic links with sessions persisted in D1. The same identity guards your routes on
              the client and your API on the edge — no password hashes, no extra service to run.
            </p>
            <ul class="mt-6 space-y-3 text-sm">
              <li
                v-for="t in [
                  'Magic-link sign-in via Resend',
                  'Sessions in D1, verified edge-side',
                  'Subscription-aware route middleware'
                ]"
                :key="t"
                class="flex items-start gap-2.5"
              >
                <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{{ t }}</span>
              </li>
            </ul>
          </div>
          <div class="code-window">
            <div class="code-chrome">
              <span class="dot dot-red" /><span class="dot dot-amber" /><span class="dot dot-green" />
              <span class="ml-2 font-mono text-xs text-muted">auth.ts</span>
            </div>
            <pre class="code-body"><code>{{ authSnippet }}</code></pre>
          </div>
        </div>

        <!-- Email + scheduling -->
        <div class="grid items-center gap-12 lg:grid-cols-2">
          <div class="lg:order-2">
            <UBadge color="primary" variant="subtle" class="mb-4">Email &amp; scheduling</UBadge>
            <h3 class="text-2xl font-semibold tracking-tight sm:text-3xl">Send email now, or schedule it</h3>
            <p class="mt-4 text-muted">
              A Durable Object owns the <em>when</em>; D1 mirrors status for inspection. Schedule future-dated
              mail to the second, dedupe by key, and cancel a whole family in one call. Strip
              &ldquo;email&rdquo; from it and it&rsquo;s a reusable do-this-later primitive.
            </p>
            <ul class="mt-6 space-y-3 text-sm">
              <li
                v-for="t in [
                  'Retry-with-backoff, capped at 5 attempts',
                  'Prefix-based bulk cancellation',
                  'Dev falls back to a drainable D1 queue'
                ]"
                :key="t"
                class="flex items-start gap-2.5"
              >
                <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{{ t }}</span>
              </li>
            </ul>
          </div>
          <div class="code-window lg:order-1">
            <div class="code-chrome">
              <span class="dot dot-red" /><span class="dot dot-amber" /><span class="dot dot-green" />
              <span class="ml-2 font-mono text-xs text-muted">scheduler.ts</span>
            </div>
            <pre class="code-body"><code>{{ emailSnippet }}</code></pre>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- ───────────────────────── Pick & choose ───────────────────────── -->
    <section class="scroll-mt-20">
      <UContainer class="py-20 sm:py-24">
        <div class="rounded-2xl border border-default bg-elevated/40 p-8 sm:p-12">
          <div class="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div class="max-w-xl">
              <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
                Keep what you need. Delete the rest.
              </h2>
              <p class="mt-4 text-muted">
                Every layer is decoupled by design. Auth&nbsp;+&nbsp;D1 are the foundation; Stripe, email, R2,
                referrals, PWA and analytics each lift out cleanly when your product doesn&rsquo;t need them.
                The whole analytics stack is even a no-op until you set a single env var.
              </p>
            </div>
            <div class="grid shrink-0 grid-cols-2 gap-3 text-sm">
              <span class="rounded-lg border border-default bg-default px-4 py-2 font-medium"
                >Auth &amp; D1 — required</span
              >
              <span class="rounded-lg border border-dashed border-default px-4 py-2 text-muted"
                >Stripe — optional</span
              >
              <span class="rounded-lg border border-dashed border-default px-4 py-2 text-muted"
                >Email — optional</span
              >
              <span class="rounded-lg border border-dashed border-default px-4 py-2 text-muted"
                >R2 — optional</span
              >
              <span class="rounded-lg border border-dashed border-default px-4 py-2 text-muted"
                >Referrals — optional</span
              >
              <span class="rounded-lg border border-dashed border-default px-4 py-2 text-muted"
                >Analytics — optional</span
              >
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- ───────────────────────── Docs / guides ───────────────────────── -->
    <section id="docs" class="scroll-mt-20 border-t border-default">
      <UContainer class="py-20 sm:py-28">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Integration guides</h2>
          <p class="mt-4 text-lg text-muted">
            Each system has a walkthrough covering setup, the gotchas it already works around, and how to
            extend it. Start with the overview and follow the path.
          </p>
        </div>

        <div class="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="g in guides"
            :key="g.n"
            :to="`${repoUrl}/blob/main/integration-guides/${g.n}-${g.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')}.md`"
            target="_blank"
            class="group flex items-center gap-4 rounded-xl border border-default bg-default p-4 transition-colors hover:border-primary/50 hover:bg-elevated/50"
          >
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <UIcon :name="g.icon" class="size-5" />
            </span>
            <span class="min-w-0">
              <span class="block font-mono text-xs text-muted">Guide {{ g.n }}</span>
              <span class="block truncate font-medium">{{ g.title }}</span>
            </span>
            <UIcon
              name="i-lucide-arrow-up-right"
              class="ml-auto size-4 text-dimmed transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
            />
          </NuxtLink>
        </div>
      </UContainer>
    </section>

    <!-- ───────────────────────── Final CTA ───────────────────────── -->
    <section class="border-t border-default">
      <UContainer class="py-20 sm:py-28">
        <UPageCTA
          title="Starting a new project?"
          description="Run the sed pass to swap in the client's name, create the D1 database, and you're running locally. The README has the full setup and deploy steps."
          variant="naked"
          class="rounded-2xl ring ring-default bg-elevated/40"
          :links="[
            {
              label: 'Use this template',
              color: 'primary',
              size: 'xl',
              to: repoUrl,
              target: '_blank',
              trailingIcon: 'i-lucide-arrow-right'
            },
            {
              label: 'Browse the code',
              color: 'neutral',
              variant: 'subtle',
              size: 'xl',
              icon: 'i-lucide-github',
              to: repoUrl,
              target: '_blank'
            }
          ]"
        />
      </UContainer>
    </section>

    <!-- ───────────────────────── Footer ───────────────────────── -->
    <UFooter>
      <template #left>
        <div class="flex items-center gap-2.5">
          <span class="logo-mark logo-mark-sm">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 2 4 9v14l12 7 12-7V9L16 2Z" class="logo-edge" />
              <path d="m9 21 6-11 4 7h-5l-2 4H9Z" class="logo-bolt" />
            </svg>
          </span>
          <p class="text-sm text-muted">
            Nuxt 4 + Cloudflare Starter — built by
            <a
              href="https://hiyield.co.uk"
              target="_blank"
              class="font-medium text-default hover:text-primary"
              >Hiyield</a
            >
          </p>
        </div>
      </template>

      <template #right>
        <UButton
          icon="i-lucide-github"
          color="neutral"
          variant="ghost"
          :to="repoUrl"
          target="_blank"
          aria-label="GitHub"
        />
        <UButton
          label="Nuxt docs"
          color="neutral"
          variant="ghost"
          to="https://nuxt.com/docs"
          target="_blank"
        />
        <UButton
          label="Cloudflare docs"
          color="neutral"
          variant="ghost"
          to="https://developers.cloudflare.com/workers/"
          target="_blank"
        />
      </template>
    </UFooter>
  </div>
</template>

<style scoped>
/* ── Logo mark ───────────────────────────────────────────── */
.logo-mark {
  display: inline-flex;
  height: 2rem;
  width: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.55rem;
  background: linear-gradient(140deg, var(--ui-primary), color-mix(in oklab, var(--ui-primary) 55%, #f6821f));
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.15),
    inset 0 1px 0 rgb(255 255 255 / 0.25);
}
.logo-mark svg {
  height: 1.1rem;
  width: 1.1rem;
}
.logo-mark-sm {
  height: 1.6rem;
  width: 1.6rem;
  border-radius: 0.45rem;
}
.logo-mark-sm svg {
  height: 0.9rem;
  width: 0.9rem;
}
.logo-edge {
  stroke: rgb(255 255 255 / 0.9);
  stroke-width: 1.6;
  stroke-linejoin: round;
}
.logo-bolt {
  fill: #fff;
}

/* ── Hero background ─────────────────────────────────────── */
.hero {
  background:
    radial-gradient(
      60% 50% at 78% 0%,
      color-mix(in oklab, var(--ui-primary) 12%, transparent),
      transparent 70%
    ),
    radial-gradient(45% 40% at 8% 8%, color-mix(in oklab, #f6821f 10%, transparent), transparent 70%);
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, var(--ui-border) 1px, transparent 1px),
    linear-gradient(to bottom, var(--ui-border) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(circle at 50% 0%, black, transparent 75%);
  opacity: 0.5;
  pointer-events: none;
}
.hero-glow {
  position: absolute;
  top: -8rem;
  right: -6rem;
  height: 24rem;
  width: 24rem;
  border-radius: 9999px;
  background: color-mix(in oklab, var(--ui-primary) 22%, transparent);
  filter: blur(120px);
  pointer-events: none;
}

.text-gradient {
  background: linear-gradient(120deg, var(--ui-primary), color-mix(in oklab, var(--ui-primary) 50%, #f6821f));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* ── Code window ─────────────────────────────────────────── */
.code-window {
  overflow: hidden;
  border-radius: 0.9rem;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
  box-shadow:
    0 20px 50px -20px rgb(0 0 0 / 0.35),
    0 1px 0 rgb(255 255 255 / 0.04) inset;
}
.code-chrome {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-bottom: 1px solid var(--ui-border);
  background: color-mix(in oklab, var(--ui-bg-elevated) 70%, var(--ui-bg));
  padding: 0.7rem 0.9rem;
}
.dot {
  height: 0.65rem;
  width: 0.65rem;
  border-radius: 9999px;
}
.dot-red {
  background: #ff5f57;
}
.dot-amber {
  background: #febc2e;
}
.dot-green {
  background: #28c840;
}
.code-body {
  margin: 0;
  overflow-x: auto;
  padding: 1.1rem 1.25rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8rem;
  line-height: 1.7;
  color: var(--ui-text-muted);
  tab-size: 2;
}
.code-body code {
  color: var(--ui-text-highlighted);
}
.code-foot {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-top: 1px solid var(--ui-border);
  background: color-mix(in oklab, var(--ui-bg-elevated) 70%, var(--ui-bg));
  padding: 0.55rem 0.9rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.7rem;
  color: var(--ui-text-muted);
}
.pulse-dot {
  height: 0.45rem;
  width: 0.45rem;
  border-radius: 9999px;
  background: var(--ui-primary);
  box-shadow: 0 0 0 0 color-mix(in oklab, var(--ui-primary) 60%, transparent);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--ui-primary) 60%, transparent);
  }
  70% {
    box-shadow: 0 0 0 6px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pulse-dot {
    animation: none;
  }
}
</style>
