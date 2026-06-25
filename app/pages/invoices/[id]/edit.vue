<script setup lang="ts">
// Edit an invoice — full page, grower-only. Loads the invoice plus the data the
// form needs. On save we navigate back to the invoice and refresh the list cache.

import type { InvoiceDto, InvoiceSettingsDto, CustomerDto, InvoiceListItemDto } from '~~/shared/types/invoice'
import type { FlowerDto } from '~~/shared/types/flower'

definePageMeta({ middleware: ['auth', 'onboarding'], layout: 'app' })

useSeoMeta({ title: 'Edit invoice', robots: 'noindex,nofollow' })

const route = useRoute()
const id = route.params.id as string

const { profile } = useProfile()
watchEffect(() => {
  if (profile.value && !profile.value.isGrower) navigateTo('/account')
})

const fetcher = useRequestFetch()
const [invoice, settings, customers, flowers] = await Promise.all([
  fetcher<InvoiceDto>(`/api/invoices/${id}`),
  fetcher<InvoiceSettingsDto>('/api/invoice-settings'),
  fetcher<CustomerDto[]>('/api/customers'),
  fetcher<FlowerDto[]>('/api/flowers')
])

const { data: invoiceList } = useNuxtData<InvoiceListItemDto[]>('my-invoices')

function onSaved(saved: InvoiceDto) {
  if (invoiceList.value) {
    const idx = invoiceList.value.findIndex((i) => i.id === saved.id)
    const item: InvoiceListItemDto = {
      id: saved.id,
      number: saved.number,
      status: saved.status,
      customerName: saved.customerName,
      issueDate: saved.issueDate,
      dueDate: saved.dueDate,
      total: saved.total
    }
    if (idx >= 0) invoiceList.value[idx] = item
  }
  navigateTo(`/invoices/${saved.id}`)
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
        @click="navigateTo(`/invoices/${id}`)"
      />
      <h1 class="font-display text-3xl font-medium text-default">Edit invoice</h1>
    </header>

    <InvoiceForm
      :invoice="invoice"
      :settings="settings"
      :customers="customers"
      :flowers="flowers"
      @saved="onSaved"
      @cancel="navigateTo(`/invoices/${id}`)"
    />
  </div>
</template>
