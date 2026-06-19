<script setup lang="ts">
// Add a flower — a full page (not a drawer). Grower-only; mirrors the guards on
// /flowers. On save we update the cached flower list in place (so /flowers shows
// the new row immediately) and navigate back.

import type { FlowerDto } from '~~/shared/types/flower'

definePageMeta({ middleware: ['auth', 'onboarding'], layout: 'app' })

useSeoMeta({ title: 'Add a flower', robots: 'noindex,nofollow' })

const { profile } = useProfile()
watchEffect(() => {
  if (profile.value && !profile.value.isGrower) navigateTo('/account')
})

// Shared cache with /flowers (same key) so a save shows up without a refetch.
const { data: flowers } = useNuxtData<FlowerDto[]>('my-flowers')

function onSaved(saved: FlowerDto) {
  if (flowers.value) flowers.value = [...flowers.value, saved]
  navigateTo('/flowers')
}
</script>

<template>
  <div class="py-5">
    <header class="mb-5 flex items-center gap-2">
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        aria-label="Back"
        @click="navigateTo('/flowers')"
      />
      <h1 class="font-display text-3xl font-medium text-default">Add a flower</h1>
    </header>

    <FlowerForm @saved="onSaved" @cancel="navigateTo('/flowers')" />
  </div>
</template>
