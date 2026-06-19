<script setup lang="ts">
import { authClient } from '~/utils/auth-client'
// Bottom tab bar for the signed-in app shell. Fixed to the viewport bottom,
// thumb-reachable, with safe-area padding for the iOS home indicator.
//
// Grower-only tabs (My Flowers + the center Add action) are gated on the shared
// profile's `isGrower` flag, owned by useProfile(). The profile is loaded
// client-side by plugins/profile.client.ts whenever there's a session, so the
// grower tabs light up on every page — including public ones like /discover
// (the PWA start_url) that don't run the onboarding middleware. We must NOT
// seed our own default here: useProfile() uses `undefined` to mean "not yet
// fetched", and a competing `null` default would wedge it (ensure() only
// fetches when undefined), hiding the grower tabs and bouncing to onboarding.
const { profile } = useProfile()
const isGrower = computed(() => !!profile.value?.isGrower)

// Auth-aware: logged-out visitors get a prominent "Start selling" CTA instead of
// a Profile tab — the bottom bar is the catchiest spot to convert a passing
// flower seller (e.g. arriving from another grower's Instagram link) into a
// signup. useSession() (no useFetch) returns a reactive ref — same as default.vue.
const session = authClient.useSession()
const isAuthed = computed(() => !!session.value.data?.user)

const emit = defineEmits<{ add: [] }>()

interface Tab {
  label: string
  icon: string
  to: string
  growerOnly?: boolean
}

const tabs = computed<Tab[]>(() =>
  [
    { label: 'Discover', icon: 'i-lucide-search', to: '/discover' },
    { label: 'My Flowers', icon: 'i-lucide-flower-2', to: '/flowers', growerOnly: true },
    // Profile only when signed in; logged-out visitors get the CTA below instead.
    ...(isAuthed.value ? [{ label: 'Profile', icon: 'i-lucide-user', to: '/account' }] : [])
  ].filter((t) => !t.growerOnly || isGrower.value)
)

function onAdd() {
  // The center Add navigates to the add-flower page; emit so the layout owns the
  // navigation (it routes to /flowers/new).
  emit('add')
}
</script>

<template>
  <nav class="fixed inset-x-0 bottom-0 z-40" aria-label="Primary">
    <!-- Mobile: full-width bottom bar. Desktop (sm+): a contained, floating pill
         centered over the content column instead of a stretched full-width bar. -->
    <ul
      class="mx-auto flex max-w-screen-sm items-stretch justify-around border-t border-default bg-elevated/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:mb-5 sm:w-fit sm:max-w-none sm:gap-1 sm:rounded-full sm:border sm:px-2 sm:pb-0 sm:shadow-sm"
    >
      <li v-for="t in tabs" :key="t.to" class="flex-1 sm:flex-initial">
        <NuxtLink
          :to="t.to"
          class="flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-2 text-muted transition-colors hover:text-default sm:px-7"
          active-class="text-primary"
        >
          <UIcon :name="t.icon" class="size-6" />
          <span class="text-[11px] font-medium">{{ t.label }}</span>
        </NuxtLink>
      </li>

      <!-- Logged-out CTA: convert passing flower sellers into signups. Takes the
           prominent slot a signed-in user's Profile/Add would occupy. -->
      <li v-if="!isAuthed" class="flex flex-[2] items-center px-2 sm:flex-initial">
        <UButton
          to="/login"
          color="primary"
          size="lg"
          icon="i-lucide-sparkles"
          class="w-full justify-center rounded-full font-medium sm:px-6"
        >
          Start selling
        </UButton>
      </li>

      <!-- Center raised Add action: growers only. Opens the add-flower page. -->
      <li v-if="isGrower" class="flex flex-1 items-center justify-center sm:flex-initial sm:px-2">
        <UButton
          icon="i-lucide-plus"
          color="primary"
          size="lg"
          class="size-12 justify-center rounded-full shadow-sm"
          aria-label="Add a flower"
          @click="onAdd"
        />
      </li>
    </ul>
  </nav>
</template>
