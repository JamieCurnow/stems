<script setup lang="ts">
// "Invoices" — the grower's invoice list. Grower-only (non-growers bounce to
// /account). Rows read like a table: number + customer on the left, amount,
// date and status on the right. Tap a row to open it. Shares its cache (key
// 'my-invoices') with the new/edit pages so saves reflect here without a refetch.

import { formatPence } from '~~/shared/utils/price'
import { formatDate } from '~~/shared/utils/time'
import type { InvoiceListItemDto } from '~~/shared/types/invoice'

definePageMeta({ middleware: ['auth', 'onboarding'], layout: 'app' })

useSeoMeta({ title: 'Invoices', robots: 'noindex,nofollow' })

const { profile } = useProfile()
watchEffect(() => {
  if (profile.value && !profile.value.isGrower) navigateTo('/account')
})

const { data: invoices } = await useFetch<InvoiceListItemDto[]>('/api/invoices', {
  key: 'my-invoices',
  default: () => []
})

// Outstanding = anything not yet paid.
const outstanding = computed(() =>
  (invoices.value ?? []).filter((i) => i.status !== 'paid').reduce((sum, i) => sum + i.total, 0)
)
</script>

<template>
  <div class="py-5">
    <header class="mb-2 flex items-center justify-between gap-3">
      <h1 class="font-display text-3xl font-medium text-default">Invoices</h1>
      <div v-if="invoices && invoices.length" class="flex items-center gap-2">
        <UButton
          icon="i-lucide-settings-2"
          color="neutral"
          variant="ghost"
          aria-label="Invoice settings"
          to="/account/invoice-settings"
        />
        <UButton icon="i-lucide-plus" label="New" color="primary" to="/invoices/new" />
      </div>
    </header>

    <p v-if="invoices && invoices.length && outstanding > 0" class="mb-4 text-sm text-muted">
      {{ formatPence(outstanding) }} outstanding
    </p>

    <!-- Empty state -->
    <div v-if="!invoices || !invoices.length" class="flex flex-col items-center gap-3 px-6 py-20 text-center">
      <UIcon name="i-lucide-receipt" class="size-7 text-primary" />
      <p class="font-display text-2xl font-medium text-default">No invoices yet</p>
      <p class="max-w-xs text-sm text-muted">
        Create an invoice for an order in seconds - pull straight from your flower list or add your own lines.
      </p>
      <UButton
        class="mt-2 rounded-full px-5"
        size="lg"
        icon="i-lucide-plus"
        label="Create your first invoice"
        to="/invoices/new"
      />
      <UButton
        class="mt-1"
        size="sm"
        color="neutral"
        variant="ghost"
        icon="i-lucide-settings-2"
        label="Set up invoice details"
        to="/account/invoice-settings"
      />
    </div>

    <!-- List -->
    <div v-else class="divide-y divide-default">
      <NuxtLink
        v-for="inv in invoices"
        :key="inv.id"
        :to="`/invoices/${inv.id}`"
        class="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-elevated/40"
      >
        <div class="min-w-0">
          <p class="truncate font-medium text-default">{{ inv.customerName }}</p>
          <p class="text-sm text-muted">{{ inv.number }} · {{ formatDate(inv.issueDate) }}</p>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1">
          <span class="font-medium tabular-nums text-default">{{ formatPence(inv.total) }}</span>
          <InvoiceStatusBadge :status="inv.status" :due-date="inv.dueDate" />
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
