<script setup lang="ts">
// Public / marketing / profile layout. The top bar and footer mirror the `/`
// landing page (index.vue) so every public page carries the same vibe: the
// EB Garamond wordmark, the same nav links + divider + pill CTA, and a floral
// footer bar. No bottom tab bar, these are shareable web pages, not the app.
import { authClient } from '~/utils/auth-client'

// useSession() (no useFetch) returns a reactive ref directly; the auth action
// resolves client-side, which is fine for this public chrome. Gating the CTA on
// !isPending stops the signed-out CTA flashing in for signed-in users, like
// index.vue / discover.vue.
const session = authClient.useSession()
const isAuthed = computed(() => !!session.value.data?.user)
const showSignedOutCta = computed(() => !session.value.isPending && !isAuthed.value)

// Same links + order as the index.vue top bar. `active-class` highlights the
// current page. Policies only lives in the footer (footerLinks), not the top nav.
const navLinks = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/about', label: 'About' },
  { to: '/blog', label: 'Blog' }
]

const footerLinks = [...navLinks, { to: '/policies', label: 'Policies' }]
</script>

<template>
  <div class="flex min-h-[100dvh] flex-col bg-default">
    <!-- Top bar. Desktop (lg+): wordmark left, full nav + divider + auth action +
         pill CTA right, sticky over a floral wash. Mobile: a slim solid-white bar
         with just the wordmark + primary CTA (the new design) — the secondary nav
         lives in the footer on mobile, not a second header row. -->
    <header
      class="sticky top-0 z-30 overflow-hidden border-b border-default bg-default pt-[env(safe-area-inset-top)] lg:bg-transparent"
    >
      <div
        class="absolute inset-0 hidden scale-110 bg-[url('/hero-flowers.svg')] bg-cover bg-center blur-xl lg:block"
        aria-hidden="true"
      />
      <div class="absolute inset-0 hidden bg-white/80 backdrop-blur-sm lg:block" aria-hidden="true" />

      <div class="relative mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-14">
        <!-- Desktop top bar -->
        <nav class="hidden items-center justify-between py-5 lg:flex" aria-label="Primary">
          <NuxtLink to="/" class="font-display text-[26px] font-medium tracking-tight text-default">
            Stems
          </NuxtLink>
          <div class="flex items-center gap-[30px]">
            <div class="flex items-center gap-[26px] text-[13px] font-medium text-muted">
              <NuxtLink
                v-for="link in navLinks"
                :key="link.to"
                :to="link.to"
                active-class="text-primary"
                class="transition-colors hover:text-primary"
              >
                {{ link.label }}
              </NuxtLink>
            </div>
            <div class="h-[18px] w-px bg-[var(--ui-border)]" aria-hidden="true" />
            <template v-if="showSignedOutCta">
              <NuxtLink
                to="/login"
                class="text-[13px] font-medium text-default transition-colors hover:text-primary"
              >
                Sign in
              </NuxtLink>
              <UButton to="/login" color="primary" size="sm" class="rounded-full px-5 py-2.5 font-medium">
                List your flowers
              </UButton>
            </template>
            <UButton
              v-else
              to="/discover"
              color="primary"
              size="sm"
              class="rounded-full px-5 py-2.5 font-medium"
            >
              Open Stems
            </UButton>
          </div>
        </nav>

        <!-- Mobile / tablet top bar — wordmark + primary CTA only (the new slim
             white header). Secondary nav is in the footer on mobile. -->
        <div class="flex h-16 items-center justify-between lg:hidden">
          <NuxtLink to="/" class="font-display text-2xl font-medium tracking-tight text-default">
            Stems
          </NuxtLink>
          <UButton
            :to="showSignedOutCta ? '/login' : '/discover'"
            color="primary"
            class="rounded-full px-5 font-medium"
          >
            {{ showSignedOutCta ? 'List your flowers' : 'Open Stems' }}
          </UButton>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer bar — mirrors the index.vue footer (floral wash on mobile, a
         clean bar on desktop). -->
    <footer class="relative overflow-hidden border-t border-default bg-default">
      <div
        class="absolute inset-0 scale-110 bg-[url('/hero-flowers.svg')] bg-cover bg-bottom blur-xl lg:hidden"
        aria-hidden="true"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-white/85 to-white lg:hidden" aria-hidden="true" />

      <div
        class="relative mx-auto flex max-w-[1120px] flex-col items-center gap-5 px-6 py-9 text-center lg:flex-row lg:justify-between lg:px-14 lg:text-left"
      >
        <div>
          <div class="font-display text-[22px] font-medium text-default">Stems</div>
          <p class="mt-[7px] text-[10px] font-semibold uppercase tracking-[0.28em] text-dimmed">
            Local · Seasonal · Grown
          </p>
        </div>
        <div
          class="flex flex-wrap items-center justify-center gap-x-[26px] gap-y-2 text-[13px] font-medium text-muted"
        >
          <NuxtLink
            v-for="link in footerLinks"
            :key="link.to"
            :to="link.to"
            active-class="text-primary"
            class="transition-colors hover:text-primary"
          >
            {{ link.label }}
          </NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
