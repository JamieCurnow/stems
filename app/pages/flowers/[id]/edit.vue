<script setup lang="ts">
// Edit a flower — a full page (not a drawer). Grower-only; mirrors the guards on
// /flowers. Fetches the flower by id (404/403 handled by the endpoint). On save
// we update the cached list in place and navigate back.

import type { FlowerDto } from '~~/shared/types/flower'

definePageMeta({ middleware: ['auth', 'onboarding'], layout: 'app' })

const route = useRoute()
const id = computed(() => route.params.id as string)

// Where to return on back / cancel / save — the caller passes `?backRoute=` (the
// public flower page, or the grower's /flowers list); defaults to /flowers.
const backRoute = useBackRoute('/flowers')

const { profile } = useProfile()
watchEffect(() => {
  if (profile.value && !profile.value.isGrower) navigateTo('/account')
})

// Auth-dependent read → cookie-forwarding fetch (not useFetch, which would dedupe
// and risk serving a logged-out response on SSR).
const { data: flower } = await useAsyncData(`flower-${id.value}`, () =>
  useRequestFetch()<FlowerDto>(`/api/flowers/${id.value}`)
)

useSeoMeta({
  title: () => (flower.value ? `Edit ${flower.value.name}` : 'Edit flower'),
  robots: 'noindex,nofollow'
})

// Shared cache with /flowers (same key) so the edit shows up without a refetch.
const { data: flowers } = useNuxtData<FlowerDto[]>('my-flowers')

function onSaved(saved: FlowerDto) {
  if (flowers.value) {
    const idx = flowers.value.findIndex((f) => f.id === saved.id)
    if (idx >= 0) flowers.value = flowers.value.map((f) => (f.id === saved.id ? saved : f))
  }
  navigateTo(backRoute.value)
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
        @click="navigateTo(backRoute)"
      />
      <h1 class="font-display text-3xl font-medium text-default">Edit flower</h1>
    </header>

    <FlowerForm v-if="flower" :flower="flower" @saved="onSaved" @cancel="navigateTo(backRoute)" />
  </div>
</template>
