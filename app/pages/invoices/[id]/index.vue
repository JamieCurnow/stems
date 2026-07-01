<script setup lang="ts">
// Invoice detail — a clean, printable document plus owner actions (edit, change
// status, delete, print). Grower-only. "Print" opens the browser print dialog
// (Save as PDF); app chrome and the action bar are hidden on print via
// `print:hidden`. The document renders the grower's settings as the "from"
// header and payment details.

import { formatPence } from '~~/shared/utils/price'
import { formatDate } from '~~/shared/utils/time'
import { taxRateLabel, invoiceStatusLabel } from '~~/shared/utils/invoice'
import type {
  InvoiceDto,
  InvoiceSettingsDto,
  InvoiceListItemDto,
  InvoiceStatus
} from '~~/shared/types/invoice'

definePageMeta({ middleware: ['auth', 'onboarding'], layout: 'app' })

const route = useRoute()
const id = route.params.id as string
const toast = useToast()
const { profile } = useProfile()

watchEffect(() => {
  if (profile.value && !profile.value.isGrower) navigateTo('/account')
})

const fetcher = useRequestFetch()
const [invoiceData, settings] = await Promise.all([
  fetcher<InvoiceDto>(`/api/invoices/${id}`),
  fetcher<InvoiceSettingsDto>('/api/invoice-settings')
])
const invoice = ref<InvoiceDto>(invoiceData)

useSeoMeta({ title: () => invoice.value.number, robots: 'noindex,nofollow' })

const fromName = computed(() => settings.businessName || profile.value?.farmName || 'Your business')

const { data: invoiceList } = useNuxtData<InvoiceListItemDto[]>('my-invoices')

function syncList(updated: InvoiceDto) {
  if (!invoiceList.value) return
  const idx = invoiceList.value.findIndex((i) => i.id === updated.id)
  if (idx >= 0) {
    invoiceList.value[idx] = {
      id: updated.id,
      number: updated.number,
      status: updated.status,
      customerName: updated.customerName,
      issueDate: updated.issueDate,
      dueDate: updated.dueDate,
      total: updated.total
    }
  }
}

// ── Status change (optimistic) ──────────────────────────────────────────────
const updating = ref(false)
async function setStatus(status: InvoiceStatus) {
  updating.value = true
  const previous = invoice.value.status
  invoice.value.status = status
  try {
    const updated = await $fetch<InvoiceDto>(`/api/invoices/${id}`, { method: 'PATCH', body: { status } })
    invoice.value = updated
    syncList(updated)
  } catch {
    invoice.value.status = previous
    toast.add({ title: 'Could not update status', color: 'error' })
  } finally {
    updating.value = false
  }
}

const statusActions = computed(() => [
  [
    {
      label: 'Mark as draft',
      icon: 'i-lucide-pencil-line',
      type: 'checkbox' as const,
      checked: invoice.value.status === 'draft',
      onSelect: () => setStatus('draft')
    },
    {
      label: 'Mark as sent',
      icon: 'i-lucide-send',
      type: 'checkbox' as const,
      checked: invoice.value.status === 'sent',
      onSelect: () => setStatus('sent')
    },
    {
      label: 'Mark as paid',
      icon: 'i-lucide-check-circle-2',
      type: 'checkbox' as const,
      checked: invoice.value.status === 'paid',
      onSelect: () => setStatus('paid')
    }
  ]
])

// Current status drives the dropdown button label + colour and the send/resend
// button wording, so the invoice's state is obvious at a glance.
const statusColor = computed<'neutral' | 'info' | 'success' | 'error'>(() => {
  const overdue =
    invoice.value.status !== 'paid' && invoice.value.dueDate != null && invoice.value.dueDate < Date.now()
  if (overdue) return 'error'
  return { draft: 'neutral', sent: 'info', paid: 'success' }[invoice.value.status]
})
const statusButtonLabel = computed(() => invoiceStatusLabel(invoice.value.status))
const isSent = computed(() => invoice.value.status === 'sent' || invoice.value.status === 'paid')

// ── Send via email ──────────────────────────────────────────────────────────
const sendOpen = ref(false)
const sending = ref(false)
async function confirmSend() {
  sending.value = true
  try {
    const updated = await $fetch<InvoiceDto>(`/api/invoices/${id}/send`, { method: 'POST' })
    invoice.value = updated
    syncList(updated)
    sendOpen.value = false
  } catch (e) {
    const message =
      typeof e === 'object' && e && 'statusMessage' in e && typeof e.statusMessage === 'string'
        ? e.statusMessage
        : 'Could not send invoice. Please try again.'
    toast.add({ title: 'Send failed', description: message, color: 'error' })
  } finally {
    sending.value = false
  }
}

// ── Delete ──────────────────────────────────────────────────────────────────
const deleteOpen = ref(false)
const deleting = ref(false)
async function confirmDelete() {
  deleting.value = true
  try {
    await $fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    if (invoiceList.value) invoiceList.value = invoiceList.value.filter((i) => i.id !== id)
    await navigateTo('/invoices')
  } catch {
    toast.add({ title: 'Could not delete invoice', color: 'error' })
    deleting.value = false
  }
}

function print() {
  window.print()
}

const hasPaymentDetails = computed(
  () =>
    settings.bankName ||
    settings.accountName ||
    settings.accountNumber ||
    settings.sortCode ||
    settings.paymentNotes
)
</script>

<template>
  <div class="py-5">
    <!-- Action bar (hidden on print) -->
    <header class="mb-6 flex items-center gap-2 print:hidden">
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        aria-label="Back to invoices"
        @click="navigateTo('/invoices')"
      />
      <div class="flex-1" />
      <UButton icon="i-lucide-printer" color="neutral" variant="ghost" aria-label="Print" @click="print" />
      <UButton
        icon="i-lucide-pencil"
        color="neutral"
        variant="ghost"
        aria-label="Edit"
        :to="`/invoices/${id}/edit`"
      />
      <UDropdownMenu :items="statusActions">
        <UButton
          icon="i-lucide-circle-dot"
          :color="statusColor"
          variant="soft"
          :label="statusButtonLabel"
          trailing-icon="i-lucide-chevron-down"
          :loading="updating"
        />
      </UDropdownMenu>
      <UButton
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        aria-label="Delete"
        @click="deleteOpen = true"
      />
      <UButton
        icon="i-lucide-send"
        color="primary"
        :variant="isSent ? 'outline' : 'solid'"
        :label="isSent ? 'Resend' : 'Send'"
        @click="sendOpen = true"
      />
    </header>

    <!-- The invoice document -->
    <article class="rounded-2xl border border-default p-6 print:border-0 print:p-0 sm:p-8">
      <!-- Top: from + invoice meta -->
      <div class="flex flex-wrap items-start justify-between gap-6">
        <div class="min-w-0">
          <img
            v-if="settings.logoUrl"
            :src="settings.logoUrl"
            :alt="fromName"
            class="mb-3 max-h-16 w-auto object-contain"
          />
          <p class="font-display text-xl font-medium text-default">{{ fromName }}</p>
          <p v-if="settings.address" class="mt-1 whitespace-pre-line text-sm text-muted">
            {{ settings.address }}
          </p>
          <p v-if="settings.email" class="text-sm text-muted">{{ settings.email }}</p>
          <p v-if="settings.phone" class="text-sm text-muted">{{ settings.phone }}</p>
          <p v-if="settings.vatNumber" class="mt-1 text-sm text-muted">VAT no. {{ settings.vatNumber }}</p>
        </div>

        <div class="text-right">
          <p class="font-display text-2xl font-medium uppercase tracking-wide text-default">Invoice</p>
          <p class="mt-1 text-sm font-medium text-default">{{ invoice.number }}</p>
          <div class="mt-2 flex justify-end print:hidden">
            <InvoiceStatusBadge :status="invoice.status" :due-date="invoice.dueDate" />
          </div>
        </div>
      </div>

      <!-- Bill to + dates -->
      <div class="mt-8 flex flex-wrap justify-between gap-6">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Bill to</p>
          <p class="mt-1 font-medium text-default">{{ invoice.customerName }}</p>
          <p v-if="invoice.customerAddress" class="whitespace-pre-line text-sm text-muted">
            {{ invoice.customerAddress }}
          </p>
          <p v-if="invoice.customerEmail" class="text-sm text-muted">{{ invoice.customerEmail }}</p>
          <p v-if="invoice.customerPhone" class="text-sm text-muted">{{ invoice.customerPhone }}</p>
        </div>
        <div class="text-right text-sm">
          <p>
            <span class="text-muted">Issued </span>
            <span class="text-default">{{ formatDate(invoice.issueDate) }}</span>
          </p>
          <p v-if="invoice.dueDate">
            <span class="text-muted">Due </span>
            <span class="text-default">{{ formatDate(invoice.dueDate) }}</span>
          </p>
        </div>
      </div>

      <!-- Lines -->
      <table class="mt-8 w-full text-sm">
        <thead>
          <tr class="border-b border-default text-left text-[11px] uppercase tracking-[0.12em] text-muted">
            <th class="py-2 font-semibold">Description</th>
            <th class="py-2 text-right font-semibold">Qty</th>
            <th class="py-2 text-right font-semibold">Unit</th>
            <th class="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr v-for="line in invoice.lines" :key="line.id">
            <td class="py-2.5 pr-3 text-default">{{ line.description }}</td>
            <td class="py-2.5 text-right tabular-nums text-muted">{{ line.quantity }}</td>
            <td class="py-2.5 text-right tabular-nums text-muted">{{ formatPence(line.unitPrice) }}</td>
            <td class="py-2.5 text-right tabular-nums text-default">{{ formatPence(line.amount) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <div class="mt-4 flex flex-col items-end gap-1.5 text-sm">
        <div class="flex w-full max-w-xs justify-between">
          <span class="text-muted">Subtotal</span>
          <span class="tabular-nums text-default">{{ formatPence(invoice.subtotal) }}</span>
        </div>
        <div v-if="invoice.taxRate > 0" class="flex w-full max-w-xs justify-between">
          <span class="text-muted">VAT ({{ taxRateLabel(invoice.taxRate) }})</span>
          <span class="tabular-nums text-default">{{ formatPence(invoice.taxAmount) }}</span>
        </div>
        <div
          class="flex w-full max-w-xs justify-between border-t border-default pt-2 text-base font-semibold"
        >
          <span>Total</span>
          <span class="tabular-nums">{{ formatPence(invoice.total) }}</span>
        </div>
      </div>

      <!-- Payment details + notes -->
      <div v-if="hasPaymentDetails || invoice.notes" class="mt-8 border-t border-default pt-5 text-sm">
        <div v-if="hasPaymentDetails">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Payment details</p>
          <div class="mt-1 text-default">
            <p v-if="settings.bankName">{{ settings.bankName }}</p>
            <p v-if="settings.accountName">{{ settings.accountName }}</p>
            <p v-if="settings.sortCode || settings.accountNumber">
              <span v-if="settings.sortCode">Sort code {{ settings.sortCode }}</span>
              <span v-if="settings.sortCode && settings.accountNumber"> · </span>
              <span v-if="settings.accountNumber">Acc {{ settings.accountNumber }}</span>
            </p>
            <p v-if="settings.paymentNotes" class="whitespace-pre-line text-muted">
              {{ settings.paymentNotes }}
            </p>
          </div>
        </div>
        <p v-if="invoice.notes" class="mt-4 whitespace-pre-line text-muted">{{ invoice.notes }}</p>
      </div>
    </article>

    <!-- Send confirmation -->
    <UModal v-model:open="sendOpen" title="Send invoice?" class="print:hidden">
      <template #body>
        <p v-if="invoice.customerEmail" class="text-sm text-muted">
          Email invoice {{ invoice.number }} to
          <span class="font-medium text-default">{{ invoice.customerEmail }}</span
          >? It'll be marked as sent.
        </p>
        <p v-else class="text-sm text-muted">
          This invoice has no customer email. Add one first so we know where to send it.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="sendOpen = false" />
          <UButton
            v-if="invoice.customerEmail"
            label="Send invoice"
            icon="i-lucide-send"
            color="primary"
            :loading="sending"
            @click="confirmSend"
          />
          <UButton v-else label="Edit invoice" color="primary" :to="`/invoices/${id}/edit`" />
        </div>
      </template>
    </UModal>

    <!-- Delete confirmation -->
    <UModal v-model:open="deleteOpen" title="Delete invoice?" class="print:hidden">
      <template #body>
        <p class="text-sm text-muted">Delete invoice {{ invoice.number }}? This can't be undone.</p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="deleteOpen = false" />
          <UButton label="Delete" color="error" :loading="deleting" @click="confirmDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
