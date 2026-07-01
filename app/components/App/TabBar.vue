<script setup lang="ts">
import { useEventListener, useTimeoutFn } from '@vueuse/core'
import { authClient } from '~/utils/auth-client'
// Bottom tab bar for the signed-in app shell. Fixed to the viewport bottom,
// thumb-reachable, with safe-area padding for the iOS home indicator.
//
// Grower-only tabs (Flowers + the center Add action) are gated on the shared
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
    { label: 'Flowers', icon: 'i-lucide-flower-2', to: '/flowers', growerOnly: true },
    // Profile only when signed in; logged-out visitors get the CTA below instead.
    ...(isAuthed.value ? [{ label: 'Profile', icon: 'i-lucide-user', to: '/account' }] : [])
  ].filter((t) => !t.growerOnly || isGrower.value)
)

const activeIndex = computed(() => tabs.value.findIndex((t) => isActive(t.to)))

// Sliding peach indicator behind the active tab (the "moving pill" you see on
// tab bars). Each tab link changes width (icon-only ↔ icon+label), but every
// active tab is the same width and the total pill width is constant, so tab k
// always sits at base + k*(inactiveWidth + gap). We measure those constants once
// while the bar is at rest, then place the indicator analytically — reading a
// tab's width mid-transition would give an in-flight value and the slide would
// lag. The element itself CSS-transitions transform+width, so it eases to the
// new tab in sync with the label that's opening.
const liRefs = ref<HTMLElement[]>([])
const setLi = (el: HTMLElement | null, i: number) => {
  if (el) liRefs.value[i] = el
}

const metrics = ref({ base: 0, wInactive: 0, gap: 0, wActive: 0, top: 0, height: 0 })

// The indicator only carries a CSS transition *while* a tab change is in flight,
// so it slides between tabs but snaps instantly on a resize/remeasure (no
// transition at rest). Pulsed on for the animation's duration on each switch.
const animating = ref(false)
const { start: keepAnimating } = useTimeoutFn(() => (animating.value = false), 320, {
  immediate: false
})

function measure() {
  const els = liRefs.value.slice(0, tabs.value.length).filter(Boolean)
  const idx = activeIndex.value
  if (els.length < 2 || idx < 0 || !els[idx]) return
  const inactive = els.find((_, i) => i !== idx) ?? els[idx]!
  metrics.value = {
    base: els[0]!.offsetLeft,
    wInactive: inactive.offsetWidth,
    gap: els[1]!.offsetLeft - (els[0]!.offsetLeft + els[0]!.offsetWidth),
    wActive: els[idx]!.offsetWidth,
    top: els[0]!.offsetTop,
    height: els[0]!.offsetHeight
  }
}

const indicatorStyle = computed(() => {
  const idx = activeIndex.value
  const m = metrics.value
  if (idx < 0 || !m.wActive) return { opacity: 0 }
  return {
    transform: `translateX(${m.base + idx * (m.wInactive + m.gap)}px)`,
    width: `${m.wActive}px`,
    top: `${m.top}px`,
    height: `${m.height}px`,
    opacity: 1
  }
})

async function remeasure() {
  await nextTick()
  measure()
}

// Animate only when moving between two real tabs — not on first appearance
// (index -1 → n), so the pill doesn't slide in from the corner on load.
watch(activeIndex, (n, o) => {
  if (o < 0 || n < 0) return
  animating.value = true
  keepAnimating()
})

onMounted(async () => {
  mounted.value = true
  await remeasure()
})

// Reposition on resize (VueUse auto-cleans the listener). With `animating` off
// at rest, this snaps to the new geometry with no transition.
useEventListener('resize', remeasure)

// The tab set changes when auth/grower state resolves (Profile / My Flowers
// appear); re-measure so the indicator geometry stays correct.
watch(() => tabs.value.length, remeasure)

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
      class="relative mx-auto mb-5 flex w-fit items-center gap-1 rounded-full border border-default bg-elevated/95 px-2 py-1 shadow-sm backdrop-blur"
    >
      <!-- Sliding peach pill behind the active tab. Absolutely positioned (out of
           flow), painted under the relatively-positioned items. -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute left-0 rounded-full bg-peach-100"
        :class="animating ? 'transition-[transform,width] duration-300 ease-out' : ''"
        :style="indicatorStyle"
      />

      <li
        v-for="(t, i) in tabs"
        :key="t.to"
        :ref="(el) => setLi(el as HTMLElement | null, i)"
        class="relative z-10"
      >
        <NuxtLink
          :to="t.to"
          class="flex h-11 items-center rounded-full transition-colors duration-200 ease-out"
          :class="
            isActive(t.to) ? 'text-primary' : 'text-muted hover:bg-[rgba(33,30,26,0.04)] hover:text-default'
          "
        >
          <!-- Fixed 44px icon box: the whole tab when collapsed (a tidy circle),
               and a stable anchor the label reveals out from when active. -->
          <span class="grid size-11 shrink-0 place-items-center">
            <UIcon :name="t.icon" class="size-[22px]" />
          </span>
          <!-- Label reveals left-to-right from behind the icon: only this clip
               window animates width (0 → fixed); the inner text keeps its full
               width and position, so it slides into view without squishing. The
               fixed width makes every active tab identical, so the sliding pill
               and the whole bar stay width-stable. Always open from sm. -->
          <span
            class="overflow-hidden transition-[width] duration-300 ease-out"
            :class="isActive(t.to) ? 'w-[4.5rem]' : 'w-0 sm:w-[4.5rem]'"
          >
            <span
              class="block w-[4.5rem] truncate text-sm font-medium transition-opacity duration-300 ease-out"
              :class="isActive(t.to) ? 'opacity-100' : 'opacity-0 sm:opacity-100'"
              >{{ t.label }}</span
            >
          </span>
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
          class="size-12 my-[2px] justify-center rounded-full shadow-sm"
          aria-label="Add a flower"
          @click="onAdd"
        />
      </li>
    </ul>
  </nav>
</template>
