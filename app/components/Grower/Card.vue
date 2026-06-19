<script setup lang="ts">
// One grower in the discovery feed. Instagram-borrowed: a borderless, avatar-led
// row that sits directly on the page with a hairline divider (drawn by the
// parent list), no card box or shadow. The whole row links to /@handle.
import { useTimeAgo } from '@vueuse/core'
import { avatarInitials, avatarTint } from '~~/shared/utils/avatar'
import type { GrowerCardDto } from '~~/server/api/search.get'

const props = defineProps<{
  grower: GrowerCardDto
}>()

const to = computed(() => `/@${props.grower.handle}`)

const initials = computed(() => avatarInitials(props.grower.farmName))

const lastActive = useTimeAgo(() => props.grower.lastActiveAt)

// "@handle · Location" on one quiet line; location omitted if unknown.
const subtitle = computed(() =>
  ['@' + props.grower.handle, props.grower.locationName].filter(Boolean).join('  ·  ')
)

const hasStock = computed(() => props.grower.flowerCount > 0)

// Warm, deterministic tint for the photo-less avatar — keyed off the handle so a
// feed of growers without photos stays varied but stays in the warm family.
const tint = computed(() => avatarTint(props.grower.handle))
</script>

<template>
  <NuxtLink
    :to="to"
    class="group flex items-center gap-4 py-4 transition-colors duration-200 hover:bg-clay-900/[0.015]"
  >
    <!-- Avatar: real photo, else warm tinted initials -->
    <img
      v-if="grower.avatarUrl"
      :src="grower.avatarUrl"
      :alt="grower.farmName"
      class="size-14 shrink-0 rounded-full object-cover"
    />
    <div
      v-else
      :class="tint"
      class="flex size-14 shrink-0 items-center justify-center rounded-full font-display text-lg font-medium"
      aria-hidden="true"
    >
      {{ initials }}
    </div>

    <div class="min-w-0 flex-1">
      <h3
        class="truncate font-display text-lg font-medium leading-snug text-default transition-colors group-hover:text-primary"
      >
        {{ grower.farmName }}
      </h3>
      <p class="truncate text-sm text-muted">{{ subtitle }}</p>

      <p class="mt-1.5 flex items-center gap-1.5 text-xs">
        <template v-if="hasStock">
          <span class="size-1.5 shrink-0 rounded-full bg-success" />
          <span class="font-medium text-success">{{ grower.flowerCount }} in season</span>
          <span class="text-dimmed">·</span>
        </template>
        <span class="truncate text-dimmed">
          {{ hasStock ? 'updated ' + lastActive : 'Just joined' }}
        </span>
      </p>
    </div>

    <UIcon
      name="i-lucide-arrow-up-right"
      class="size-4 shrink-0 text-dimmed opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100"
    />
  </NuxtLink>
</template>
