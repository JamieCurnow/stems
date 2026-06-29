<script setup lang="ts">
// Public / marketing / profile layout. A slim top bar with the Stems wordmark,
// a contextual auth action, and the shared utility nav (same links + styling as
// the /discover hero) so every public page can reach the others. No bottom tab
// bar, these are shareable web pages, not the app.
import { authClient } from '~/utils/auth-client'

// useSession() (no useFetch) returns a reactive ref directly; the auth action
// resolves client-side, which is fine for this public chrome.
const session = authClient.useSession()
const signedIn = computed(() => !!session.value.data?.user)

// Mirrors the /discover hero nav. `active-class` highlights the current page.
const navLinks = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/about', label: 'About' },
  { to: '/blog', label: 'Blog' },
  { to: '/policies', label: 'Policies' }
]
</script>

<template>
  <div class="flex min-h-[100dvh] flex-col bg-default">
    <header
      class="sticky top-0 z-30 border-b border-default bg-elevated/95 pt-[env(safe-area-inset-top)] backdrop-blur"
    >
      <div class="mx-auto w-full max-w-screen-md px-4">
        <div class="flex h-14 items-center justify-between">
          <NuxtLink to="/" class="font-display text-xl font-semibold text-default"> Stems </NuxtLink>

          <UButton
            :to="signedIn ? '/discover' : '/login'"
            color="primary"
            :variant="signedIn ? 'solid' : 'soft'"
            size="sm"
          >
            {{ signedIn ? 'Open app' : 'Sign in' }}
          </UButton>
        </div>

        <!-- Shared utility nav: same eyebrow styling as the /discover hero,
             wraps on small screens so it stays visible at every size. -->
        <nav
          class="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 pb-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted"
          aria-label="Primary"
        >
          <template v-for="(link, i) in navLinks" :key="link.to">
            <span v-if="i > 0" class="text-dimmed" aria-hidden="true">·</span>
            <NuxtLink :to="link.to" active-class="text-primary" class="transition-colors hover:text-primary">
              {{ link.label }}
            </NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
