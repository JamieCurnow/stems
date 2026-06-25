<script setup lang="ts">
// Small status pill for invoices. Colour-codes draft / sent / paid, plus an
// "overdue" tint when an unpaid invoice is past its due date.
import { invoiceStatusLabel } from '~~/shared/utils/invoice'
import type { InvoiceStatus } from '~~/shared/types/invoice'

const props = defineProps<{
  status: InvoiceStatus
  dueDate?: number | null
}>()

const isOverdue = computed(
  () => props.status !== 'paid' && props.dueDate != null && props.dueDate < Date.now()
)

const color = computed<'neutral' | 'info' | 'success' | 'error'>(() => {
  if (isOverdue.value) return 'error'
  return { draft: 'neutral', sent: 'info', paid: 'success' }[props.status] as 'neutral' | 'info' | 'success'
})

const label = computed(() => (isOverdue.value ? 'Overdue' : invoiceStatusLabel(props.status)))
</script>

<template>
  <UBadge :color="color" variant="subtle" class="rounded-full">{{ label }}</UBadge>
</template>
