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

// Auth + grower state both resolve client-side, so the server can't know them.
// Gate the auth-dependent tabs on mount: the server render and the first client
// render both show the logged-out shell (so they match — no hydration mismatch),
// then the correct tabs light up once mounted.
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const isGrower = computed(() => mounted.value && !!profile.value?.isGrower)

// Auth-aware: logged-out visitors get a prominent "Start selling" CTA instead of
// a Profile tab — the bottom bar is the catchiest spot to convert a passing
// flower seller (e.g. arriving from another grower's Instagram link) into a
// signup. useSession() (no useFetch) returns a reactive ref — same as default.vue.
const session = authClient.useSession()
const isAuthed = computed(() => mounted.value && !!session.value.data?.user)

// Active-tab styling needs the current path so the active segment can render its
// label + soft-peach fill (NuxtLink's active-class only swaps a class, not the
// icon-only → icon+label layout the floating pill uses).
const route = useRoute()
const isActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`)

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
  <nav
    class="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] print:hidden"
    aria-label="Primary"
  >
    <!-- A centred, floating, rounded pill at every width (previously sm-only).
         Items are horizontal segments: inactive tabs collapse to an icon-only
         circle on the narrowest screens and reveal their label from sm; the
         active tab always shows a soft-peach icon+label segment. -->
    <ul
      class="mx-auto mb-5 flex w-fit items-center gap-1 rounded-full border border-default bg-elevated/95 p-2 shadow-sm backdrop-blur"
    >
      <li v-for="t in tabs" :key="t.to">
        <NuxtLink
          :to="t.to"
          class="flex h-11 items-center justify-center gap-2 rounded-full px-3 transition-colors sm:px-4"
          :class="
            isActive(t.to)
              ? 'bg-peach-100 text-primary'
              : 'text-muted hover:bg-[rgba(33,30,26,0.04)] hover:text-default'
          "
        >
          <UIcon :name="t.icon" class="size-[22px] shrink-0" />
          <span
            class="text-sm font-medium"
            :class="isActive(t.to) ? 'inline' : 'hidden sm:inline'"
            >{{ t.label }}</span
          >
        </NuxtLink>
      </li>

      <!-- Logged-out CTA: convert passing flower sellers into signups. Takes the
           prominent slot a signed-in user's Profile/Add would occupy. -->
      <li v-if="!isAuthed">
        <UButton
          to="/login"
          color="primary"
          size="lg"
          icon="i-lucide-sparkles"
          class="h-11 justify-center rounded-full font-medium"
        >
          Start selling
        </UButton>
      </li>

      <!-- Center raised Add action: growers only. Opens the add-flower page. -->
      <li v-if="isGrower" class="ml-0.5">
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
