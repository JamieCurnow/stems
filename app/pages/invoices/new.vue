<script setup lang="ts">
// Create an invoice — a full page. Grower-only; mirrors the guards on /invoices.
// Loads the data the form needs (settings, saved contacts, flower list) then
// hands off to <InvoiceForm>. On save we navigate to the new invoice.

import type { InvoiceDto, InvoiceSettingsDto, CustomerDto, InvoiceListItemDto } from '~~/shared/types/invoice'
import type { FlowerDto } from '~~/shared/types/flower'

definePageMeta({ middleware: ['auth', 'onboarding'], layout: 'app' })

useSeoMeta({ title: 'New invoice', robots: 'noindex,nofollow' })

const { profile } = useProfile()
watchEffect(() => {
  if (profile.value && !profile.value.isGrower) navigateTo('/account')
})

const fetcher = useRequestFetch()
const [settings, customers, flowers] = await Promise.all([
  fetcher<InvoiceSettingsDto>('/api/invoice-settings'),
  fetcher<CustomerDto[]>('/api/customers'),
  fetcher<FlowerDto[]>('/api/flowers')
])

// Keep the list cache fresh so the new invoice shows on /invoices immediately.
const { data: invoiceList } = useNuxtData<InvoiceListItemDto[]>('my-invoices')

function onSaved(saved: InvoiceDto) {
  if (invoiceList.value) {
    invoiceList.value = [
      {
        id: saved.id,
        number: saved.number,
        status: saved.status,
        customerName: saved.customerName,
        issueDate: saved.issueDate,
        dueDate: saved.dueDate,
        total: saved.total
      },
      ...invoiceList.value
    ]
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
        @click="navigateTo('/invoices')"
      />
      <h1 class="font-display text-3xl font-medium text-default">New invoice</h1>
    </header>

    <InvoiceForm
      :settings="settings"
      :customers="customers"
      :flowers="flowers"
      @saved="onSaved"
      @cancel="navigateTo('/invoices')"
    />
  </div>
</template>
