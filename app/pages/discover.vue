<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import type { GrowerCardDto } from '~~/server/api/search.get'

// PUBLIC discovery page — the app's main entry. Reachable logged-out and, when
// signed in, sits under the app tab bar. layout: 'app' shows the tab bar for
// signed-in users; layouts don't gate auth, so this still renders fine
// logged-out. No auth middleware — it's public on purpose. The logged-out
// "Start selling" CTA lives in the tab bar (App/TabBar.vue), not this header.
definePageMeta({ layout: 'app' })

useSeoMeta({
  title: 'Discover growers',
  description: 'Find local flower growers by name or area on Stems.'
})

const q = ref('')
// Debounce the term that hits the API (~250ms) while keeping the input snappy.
// Empty term → the API returns the recently-active browse list.
const debouncedQ = refDebounced(q, 250)

const { data, status } = await useFetch<GrowerCardDto[]>('/api/search', {
  query: { q: debouncedQ },
  default: () => []
})

const isLoading = computed(() => status.value === 'pending')
const trimmedQ = computed(() => q.value.trim())
const hasResults = computed(() => (data.value?.length ?? 0) > 0)
const isSearching = computed(() => trimmedQ.value.length > 0)
const resultCount = computed(() => data.value?.length ?? 0)

const inviteMailto = computed(() => {
  const subject = encodeURIComponent('Join me on Stems')
  const body = encodeURIComponent(
    "I'm looking for local flower growers on Stems. You should set up a page: https://stems.market"
  )
  return `mailto:?subject=${subject}&body=${body}`
})
</script>

<template>
  <div>
    <!-- Branded entry header: name + slogan over a soft, blurred floral image.
         Full-bleed (100vw) so the image runs edge-to-edge on desktop; the text
         stays aligned to the content column. -->
    <header class="relative mx-[calc(50%-50vw)] mb-3 w-screen overflow-hidden">
      <div
        class="absolute inset-0 scale-110 bg-[url('/hero-flowers.svg')] bg-cover bg-center blur-xl"
        aria-hidden="true"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-white/45 via-white/40 to-white" aria-hidden="true" />

      <div class="relative mx-auto max-w-screen-sm px-6 pb-6 pt-12 text-center sm:pb-8 sm:pt-16">
        <p
          class="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary sm:text-[11px] sm:tracking-[0.32em]"
        >
          Local · Seasonal · Grown
        </p>
        <h1
          class="mt-2 font-display text-[46px] font-medium leading-[0.95] tracking-tight text-default sm:mt-3 sm:text-6xl"
        >
          <NuxtLink to="/" class="select-none">Stems</NuxtLink>
        </h1>
        <p class="mx-auto mt-2.5 max-w-[230px] text-balance text-sm text-muted sm:mt-3 sm:max-w-[340px] sm:text-base">
          Find a local grower by name, handle or area
        </p>

        <!-- Quiet utility nav, styled like the eyebrow above. Points at the
             standalone public pages (default layout). Always shown. -->
        <nav
          class="mt-4 flex flex-wrap items-center justify-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted sm:mt-5 sm:text-[11px] sm:tracking-[0.18em]"
          aria-label="More"
        >
          <NuxtLink to="/how-it-works" class="transition-colors hover:text-primary">How it works</NuxtLink>
          <span class="text-dimmed" aria-hidden="true">·</span>
          <NuxtLink to="/about" class="transition-colors hover:text-primary">About</NuxtLink>
          <span class="text-dimmed" aria-hidden="true">·</span>
          <NuxtLink to="/blog" class="transition-colors hover:text-primary">Blog</NuxtLink>
        </nav>
      </div>
    </header>

    <!-- Sticky search: a defined white pill that lifts off the page. -->
    <div class="sticky top-0 z-20 -mx-4 bg-white/90 px-4 py-3 backdrop-blur">
      <UInput
        v-model="q"
        icon="i-lucide-search"
        size="lg"
        placeholder="Search name, @username or area"
        :loading="isLoading"
        autocomplete="off"
        class="w-full"
        :ui="{
          root: 'w-full',
          base: 'rounded-full bg-default shadow-sm ring-1 ring-default focus-visible:ring-2 focus-visible:ring-primary'
        }"
      >
        <template v-if="q" #trailing>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Clear search"
            @click="q = ''"
          />
        </template>
      </UInput>
    </div>

    <!-- Section label + quiet count. -->
    <div class="mb-1 mt-4 flex items-baseline justify-between px-1">
      <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
        {{ isSearching ? 'Results' : 'Growers near you' }}
      </h2>
      <span v-if="!isLoading && hasResults" class="text-xs tabular-nums text-dimmed">
        {{ resultCount }}
      </span>
    </div>

    <!-- Loading: borderless skeleton rows -->
    <div v-if="isLoading" class="divide-y divide-default">
      <div v-for="i in 6" :key="i" class="flex items-center gap-4 py-4">
        <USkeleton class="size-14 shrink-0 rounded-full" />
        <div class="flex-1 space-y-2">
          <USkeleton class="h-4 w-2/5" />
          <USkeleton class="h-3 w-3/5" />
          <USkeleton class="h-3 w-1/4" />
        </div>
      </div>
    </div>

    <!-- Feed -->
    <div v-else-if="hasResults" class="divide-y divide-default">
      <GrowerCard v-for="grower in data" :key="grower.handle" :grower="grower" />
    </div>

    <!-- Empty: searched but nothing matched -->
    <div v-else-if="isSearching" class="flex flex-col items-center gap-3 px-6 py-20 text-center">
      <UIcon name="i-lucide-search" class="size-7 text-dimmed" />
      <p class="font-display text-2xl font-medium text-default">Nothing for “{{ trimmedQ }}” yet</p>
      <p class="max-w-xs text-sm text-muted">Know a grower who should be here? Send them an invite.</p>
      <UButton :to="inviteMailto" external color="primary" variant="soft" class="mt-2 rounded-full px-5">
        Invite a grower
      </UButton>
    </div>

    <!-- Empty: nothing to browse yet -->
    <div v-else class="flex flex-col items-center gap-3 px-6 py-20 text-center">
      <UIcon name="i-lucide-flower-2" class="size-7 text-primary" />
      <p class="font-display text-2xl font-medium text-default">First blooms coming soon</p>
      <p class="max-w-xs text-sm text-muted">New growers are setting up their pages - check back shortly.</p>
    </div>
  </div>
</template>
