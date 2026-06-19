<script setup lang="ts">
// "My Flowers" — the grower's working surface. Grower-only; non-growers are
// bounced to /account. Add/edit live on dedicated pages (/flowers/new and
// /flowers/[id]/edit); this page navigates to them and shares its flower list
// cache (key 'my-flowers') so saves reflect here without a refetch.
//
// The single highest-frequency action is updating stems available — handled
// inline on each <FlowerCard> via a number input, PATCHing stemsAvailable only
// and applying the change optimistically.

import type { FlowerDto } from '~~/shared/types/flower'
import { bunchPrice, formatPence } from '~~/shared/utils/price'
import { availabilityStatusLabel } from '~~/shared/utils/flowers'

definePageMeta({ middleware: ['auth', 'onboarding'], layout: 'app' })

useSeoMeta({ title: 'My Flowers', robots: 'noindex,nofollow' })

const toast = useToast()
const { profile } = useProfile()

// Guard non-growers (profile is already ensured by the onboarding middleware).
watchEffect(() => {
  if (profile.value && !profile.value.isGrower) navigateTo('/account')
})

// Load the grower's flowers (SSR-friendly). The explicit key lets the add/edit
// pages update this cached list in place via useNuxtData('my-flowers').
const { data: flowers } = await useFetch<FlowerDto[]>('/api/flowers', {
  key: 'my-flowers',
  default: () => []
})

// ── Add / edit (dedicated pages, not a drawer) ──────────────────────────────
function openAdd() {
  navigateTo('/flowers/new')
}

function openEdit(flower: FlowerDto) {
  navigateTo(`/flowers/${flower.id}/edit`)
}

// ── Inline stems-available change (optimistic) ──────────────────────────────
async function changeStems(id: string, stemsAvailable: number | null) {
  const list = flowers.value ?? []
  const item = list.find((f) => f.id === id)
  if (!item) return
  const previous = item.stemsAvailable
  item.stemsAvailable = stemsAvailable // optimistic
  try {
    const updated = await $fetch<FlowerDto>(`/api/flowers/${id}`, {
      method: 'PATCH',
      body: { stemsAvailable }
    })
    item.updatedAt = updated.updatedAt
  } catch {
    item.stemsAvailable = previous // revert
    toast.add({ title: 'Could not update stock', color: 'error' })
  }
}

// ── Duplicate ("same flower, new colour") ───────────────────────────────────
async function duplicate(flower: FlowerDto) {
  try {
    const created = await $fetch<FlowerDto>('/api/flowers', {
      method: 'POST',
      body: {
        name: flower.name,
        variety: flower.variety,
        color: flower.color,
        stemLengthCm: flower.stemLengthCm,
        stemsPerBunch: flower.stemsPerBunch,
        pricePerStem: flower.pricePerStem,
        // Don't copy the derived bunch price as an override.
        pricePerBunch: null,
        availabilityStatus: flower.availabilityStatus,
        stemsAvailable: flower.stemsAvailable,
        notes: flower.notes
      }
    })
    ;(flowers.value ?? []).push(created)
  } catch {
    toast.add({ title: 'Could not duplicate', color: 'error' })
  }
}

// ── Archive (soft delete, optimistic) ───────────────────────────────────────
async function archive(flower: FlowerDto) {
  const list = flowers.value ?? []
  const idx = list.findIndex((f) => f.id === flower.id)
  if (idx < 0) return
  const [removed] = list.splice(idx, 1)
  try {
    const url: string = `/api/flowers/${flower.id}`
    await $fetch(url, { method: 'DELETE' })
  } catch {
    if (removed) list.splice(idx, 0, removed) // revert
    toast.add({ title: 'Could not archive', color: 'error' })
  }
}

// ── Export to spreadsheet (client-side CSV) ─────────────────────────────────
// CSV opens directly in Excel / Google Sheets — no extra dependency, and the
// columns mirror what the grower sees in the app (prices in £, stock as words).
function csvCell(value: string | number | null): string {
  const s = value == null ? '' : String(value)
  // Quote when the cell contains a delimiter, quote, or newline; double quotes.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function stemsLabel(stemsAvailable: number | null): string {
  if (stemsAvailable == null) return 'Available'
  if (stemsAvailable === 0) return 'Sold out'
  return String(stemsAvailable)
}

function exportCsv() {
  const list = flowers.value ?? []
  if (!list.length) return
  const headers = [
    'Name',
    'Variety',
    'Colour',
    'Stem length (cm)',
    'Stems per bunch',
    'Price per stem',
    'Price per bunch',
    'Status',
    'Stems available',
    'Notes'
  ]
  const rows = list.map((f) =>
    [
      f.name,
      f.variety,
      f.color,
      f.stemLengthCm,
      f.stemsPerBunch,
      formatPence(f.pricePerStem),
      formatPence(bunchPrice(f)),
      availabilityStatusLabel(f.availabilityStatus),
      stemsLabel(f.stemsAvailable),
      f.notes
    ]
      .map(csvCell)
      .join(',')
  )
  // Prepend a BOM so Excel reads the £ signs as UTF-8.
  const csv = '﻿' + [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `my-flowers-${date}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="py-5">
    <header class="mb-2 flex items-center justify-between gap-3">
      <h1 class="font-display text-3xl font-medium text-default">My Flowers</h1>
      <div v-if="flowers && flowers.length" class="flex items-center gap-2">
        <UButton icon="i-lucide-sheet" label="Export" color="neutral" variant="ghost" @click="exportCsv" />
        <UButton icon="i-lucide-plus" label="Add" color="primary" @click="openAdd" />
      </div>
    </header>

    <!-- Empty state: calm and box-free -->
    <div v-if="!flowers || !flowers.length" class="flex flex-col items-center gap-3 px-6 py-20 text-center">
      <UIcon name="i-lucide-flower-2" class="size-7 text-primary" />
      <p class="font-display text-2xl font-medium text-default">Your flower list is empty</p>
      <p class="max-w-xs text-sm text-muted">
        Everything you add shows up on your shareable Stems page - share the link and buyers see your live
        availability.
      </p>
      <UButton
        class="mt-2 rounded-full px-5"
        size="lg"
        icon="i-lucide-plus"
        label="Add your first flower"
        @click="openAdd"
      />
    </div>

    <!-- Borderless feed: hairline dividers, rows sit on the page -->
    <div v-else class="divide-y divide-default">
      <FlowerCard
        v-for="f in flowers"
        :key="f.id"
        :flower="f"
        editable
        @change-stems="changeStems"
        @edit="openEdit"
        @duplicate="duplicate"
        @archive="archive"
      />
    </div>
  </div>
</template>
