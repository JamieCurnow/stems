<script setup lang="ts">
// Presentational invoice summary card for the marketing pages (`/` and
// `/how-it-works`). A static illustration of the printable invoice — it mirrors
// the real invoice domain (`app/pages/invoices/[id]/`) so it reads as authentic,
// but is never wired to live data. Responsive: 330px / rounded-[14px] on mobile,
// 420px / rounded-[16px] from `lg` per the desktop handoff. Money is plain
// example copy (tabular-nums so the column lines up). No em-dashes, UK spelling.
interface InvoiceLine {
  name: string
  qty: string
  amount: string
}

withDefaults(
  defineProps<{
    number?: string
    status?: string
    billedTo?: string
    lines?: InvoiceLine[]
    total?: string
  }>(),
  {
    number: 'INV-0007',
    status: 'Paid',
    billedTo: 'Mevagissey Flowers',
    lines: () => [
      { name: 'Cosmos', qty: '40 stems', amount: '£32.00' },
      { name: 'Sweet peas', qty: '30 stems', amount: '£15.00' },
      { name: 'Cornflower', qty: '60 stems', amount: '£18.00' }
    ],
    total: '£65.00'
  }
)
</script>

<template>
  <div
    class="max-w-[330px] rounded-[14px] border border-[#EFE7E2] bg-white p-5 text-left shadow-[0_10px_28px_-16px_rgba(33,30,26,0.22)] lg:w-[420px] lg:max-w-none lg:rounded-[16px] lg:p-7 lg:shadow-[0_18px_44px_-22px_rgba(33,30,26,0.28)]"
  >
    <div class="flex items-start justify-between">
      <div>
        <div
          class="font-display text-[15px] font-medium uppercase tracking-[0.14em] text-default lg:text-[19px]"
        >
          Invoice
        </div>
        <div class="mt-1 text-[11px] font-medium text-muted lg:mt-1.5 lg:text-[13px]">{{ number }}</div>
      </div>
      <span
        class="rounded-full bg-success/10 px-3 py-1.5 text-[10px] font-medium text-success lg:px-3.5 lg:py-2 lg:text-[12px]"
      >
        {{ status }}
      </span>
    </div>

    <div class="mt-4 text-[10px] uppercase tracking-[0.04em] text-dimmed lg:mt-5 lg:text-[11px]">
      Billed to
    </div>
    <div class="mt-1 text-[13px] font-medium text-default lg:text-[15px]">{{ billedTo }}</div>

    <div class="mt-4 divide-y divide-[#F4F1EB] border-t border-[#EFEBE4] lg:mt-5">
      <div
        v-for="line in lines"
        :key="line.name"
        class="flex items-center justify-between py-2.5 lg:py-[13px]"
      >
        <span class="text-[12px] text-default lg:text-[14px]">
          {{ line.name }} <span class="text-dimmed">· {{ line.qty }}</span>
        </span>
        <span class="text-[12px] font-medium tabular-nums text-default lg:text-[14px]">
          {{ line.amount }}
        </span>
      </div>
    </div>

    <div class="mt-0.5 flex items-center justify-between border-t border-[#EFEBE4] pt-3.5 lg:pt-4">
      <span class="font-display text-sm font-medium text-default lg:text-[17px]">Total</span>
      <span class="text-base font-medium tabular-nums text-default lg:text-xl">{{ total }}</span>
    </div>

    <div
      class="mt-3.5 flex items-center gap-1.5 text-[10px] font-medium text-dimmed lg:mt-[18px] lg:text-[12px]"
    >
      <UIcon name="i-lucide-flower-2" class="size-3 text-primary/40 lg:size-3.5" />
      Pulled straight from your flower list
    </div>
  </div>
</template>
