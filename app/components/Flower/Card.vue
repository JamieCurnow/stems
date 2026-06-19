<script setup lang="ts">
// Shared flower card — used by the grower's /flowers manager (editable) AND the
// public grower page (doc 08, read-only). Drives off a FlowerDto.
//
// Prop contract (stable — doc 08 reuses this):
//   flower    FlowerDto                         required, the flower to render
//   editable  boolean (default false)           grower-owner view: shows the
//                                                inline stems-available quick
//                                                edit + the overflow menu (Edit /
//                                                Duplicate / Archive). When
//                                                false the card is read-only.
//
// Events (only meaningful when editable):
//   change-stems  [id: string, stems: number | null]   (null = "available", 0 = sold out)
//   edit          [flower: FlowerDto]
//   duplicate     [flower: FlowerDto]
//   archive       [flower: FlowerDto]

import { availabilityStatusMeta, isSoldOut, stemsLabel } from '~~/shared/utils/flowers'
import { bunchPrice, formatPence } from '~~/shared/utils/price'
import type { FlowerDto } from '~~/shared/types/flower'

const props = withDefaults(
  defineProps<{
    flower: FlowerDto
    editable?: boolean
  }>(),
  { editable: false }
)

const emit = defineEmits<{
  'change-stems': [id: string, stems: number | null]
  edit: [flower: FlowerDto]
  duplicate: [flower: FlowerDto]
  archive: [flower: FlowerDto]
}>()

const thumb = computed(() => props.flower.photoUrls[0] ?? null)

const soldOut = computed(() => isSoldOut(props.flower))
const statusMeta = computed(() => availabilityStatusMeta(props.flower.availabilityStatus))

const subtitle = computed(() =>
  [
    props.flower.variety,
    props.flower.color,
    props.flower.stemLengthCm != null ? `${props.flower.stemLengthCm}cm` : null
  ]
    .filter(Boolean)
    .join(' · ')
)

// Price line: "£0.85/stem · £8.50/bunch" — drop the parts that are unknown.
const priceLine = computed(() => {
  const parts: string[] = []
  if (props.flower.pricePerStem != null) parts.push(`${formatPence(props.flower.pricePerStem)}/stem`)
  const bunch = bunchPrice(props.flower)
  if (bunch != null) parts.push(`${formatPence(bunch)}/bunch`)
  return parts.join(' · ')
})

// Inline stems quick-edit (editable view). Commits on blur/enter (@change):
// empty → null ("Available"), 0 → sold out, n → that many stems.
function commitStems(e: Event) {
  const raw = (e.target as HTMLInputElement).value.trim()
  let next: number | null
  if (raw === '') next = null
  else {
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) return
    next = Math.floor(n)
  }
  if (next !== props.flower.stemsAvailable) emit('change-stems', props.flower.id, next)
}

const menuItems = computed(() => [
  [
    {
      label: 'Edit',
      icon: 'i-lucide-pencil',
      onSelect: () => emit('edit', props.flower)
    },
    {
      label: 'Duplicate',
      icon: 'i-lucide-copy',
      onSelect: () => emit('duplicate', props.flower)
    }
  ],
  [
    {
      label: 'Archive',
      icon: 'i-lucide-archive',
      color: 'error' as const,
      onSelect: () => emit('archive', props.flower)
    }
  ]
])
</script>

<template>
  <!-- Borderless row (Toast × Instagram): sits directly on the page; the parent
       list draws the hairline divider. No card box or shadow. -->
  <div class="flex items-start gap-4 py-4" :class="{ 'opacity-60': soldOut }">
    <!-- Portrait thumbnail -->
    <div class="aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
      <img v-if="thumb" :src="thumb" :alt="flower.name" class="size-full object-cover" loading="lazy" />
      <div v-else class="flex size-full items-center justify-center text-dimmed">
        <UIcon name="i-lucide-flower-2" class="size-6" />
      </div>
    </div>

    <!-- Details -->
    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="truncate font-display text-lg font-medium leading-snug text-default">
            {{ flower.name }}
          </h3>
          <p v-if="subtitle" class="truncate text-sm text-muted">{{ subtitle }}</p>
        </div>

        <!-- Overflow menu (editable only) -->
        <UDropdownMenu v-if="editable" :items="menuItems" :content="{ align: 'end' }">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="sm"
            class="-mr-1 shrink-0"
            aria-label="Flower options"
          />
        </UDropdownMenu>
      </div>

      <p v-if="priceLine || flower.openToOffers" class="mt-0.5 text-sm font-medium text-default">
        <span v-if="priceLine">{{ priceLine }}</span>
        <span v-if="flower.openToOffers" class="text-primary">
          <span v-if="priceLine" class="text-dimmed"> · </span>Open to offers
        </span>
      </p>

      <!-- Availability: a status badge (if set) + the stem count. In editable
           mode the count is an inline quick-edit (empty = "Available", 0 = sold
           out, n = that many stems); read-only contexts show a static label. -->
      <div class="mt-1.5 flex flex-wrap items-center gap-2">
        <UBadge
          v-if="statusMeta"
          :color="statusMeta.color"
          variant="subtle"
          size="sm"
          :label="statusMeta.label"
        />

        <UInput
          v-if="editable"
          :model-value="flower.stemsAvailable?.toString() ?? ''"
          type="number"
          inputmode="numeric"
          min="0"
          placeholder="Available"
          size="sm"
          class="w-36"
          aria-label="Stems available"
          @change="commitStems"
        >
          <template #trailing>
            <span class="text-xs text-muted">stems</span>
          </template>
        </UInput>

        <span v-else class="text-sm" :class="soldOut ? 'text-dimmed' : 'text-muted'">
          {{ stemsLabel(flower.stemsAvailable) }}
        </span>
      </div>

      <p v-if="flower.notes" class="mt-1.5 flex items-center gap-1.5 truncate text-sm italic text-dimmed">
        <UIcon name="i-lucide-sticky-note" class="size-3.5 shrink-0 not-italic" />
        {{ flower.notes }}
      </p>
    </div>
  </div>
</template>
