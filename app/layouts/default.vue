<script setup lang="ts">
// Public / marketing / profile layout. Minimal: a slim top bar with the Stems
// wordmark and a contextual auth action. No bottom tab bar — these are
// shareable web pages, not the app.
import { authClient } from '~/utils/auth-client'

// useSession() (no useFetch) returns a reactive ref directly; the auth action
// resolves client-side, which is fine for this public chrome.
const session = authClient.useSession()
const signedIn = computed(() => !!session.value.data?.user)
</script>

<template>
  <div class="flex min-h-[100dvh] flex-col bg-default">
    <header
      class="sticky top-0 z-30 border-b border-default bg-elevated/95 pt-[env(safe-area-inset-top)] backdrop-blur"
    >
      <div class="mx-auto flex h-14 w-full max-w-screen-md items-center justify-between px-4">
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
    </header>

    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
