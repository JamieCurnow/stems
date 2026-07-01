<script setup lang="ts">
// Signed-in app shell: full-height column with scrollable content and a fixed
// bottom tab bar. Pages opt in with definePageMeta({ layout: 'app' }).
//
// Pages can set a lightweight contextual header per route via:
//   defineExpose / useState — here we read it from page meta-driven props is
// avoided; instead the header is optional and rendered by the page itself.
//
// The center Add action emits from the tab bar; it navigates to the dedicated
// add-flower page.
function onAdd() {
  navigateTo('/flowers/new')
}

// Focused pages (e.g. the single flower listing, which has its own sticky
// Contact bar) can hide the floating tab bar via `definePageMeta({ hideTabBar:
// true })`. When hidden, the main pane drops its tab-bar clearance padding.
const route = useRoute()
const hideTabBar = computed(() => (route.meta as { hideTabBar?: boolean }).hideTabBar === true)
</script>

<template>
  <div class="flex min-h-[100dvh] flex-col bg-default">
    <!-- Scrollable content. Bottom padding clears the fixed tab bar + safe area
         (dropped when a page hides the tab bar and supplies its own footer). -->
    <main
      class="flex-1"
      :class="hideTabBar ? 'pb-[env(safe-area-inset-bottom)]' : 'pb-[calc(env(safe-area-inset-bottom)+5rem)]'"
    >
      <div class="mx-auto w-full max-w-screen-sm px-4">
        <slot />
      </div>
    </main>

    <AppTabBar v-if="!hideTabBar" @add="onAdd" />
  </div>
</template>
