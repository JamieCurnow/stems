<script setup lang="ts">
// Signed-in app shell: full-height column with scrollable content and a fixed
// bottom tab bar. Pages opt in with definePageMeta({ layout: 'app' }).
//
// Pages can set a lightweight contextual header per route via:
//   defineExpose / useState — here we read it from page meta-driven props is
// avoided; instead the header is optional and rendered by the page itself.
//
// The center Add action emits from the tab bar. The /flowers page opens its
// add-flower drawer automatically when it sees ?add=1.
function onAdd() {
  navigateTo('/flowers?add=1')
}
</script>

<template>
  <div class="flex min-h-[100dvh] flex-col bg-default">
    <!-- Scrollable content. Bottom padding clears the fixed tab bar + safe area. -->
    <main class="flex-1 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <div class="mx-auto w-full max-w-screen-sm px-4">
        <slot />
      </div>
    </main>

    <AppTabBar @add="onAdd" />
  </div>
</template>
