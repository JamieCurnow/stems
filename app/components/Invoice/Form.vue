<script setup lang="ts">
// Create / edit invoice form. Rendered inline on /invoices/new and
// /invoices/[id]/edit. Money is pence end-to-end; we convert at the <input>
// boundary via parsePounds(). Totals derive live from the line items.
//
// Customer: pick a saved contact (fills the fields) or type a new one. New
// contacts are saved to the reusable list on save unless the grower opts out.
//
// Lines: add blank rows, or quick-add from the grower's flower list (prefills
// description + unit price). flowerId is kept as a soft link.

import { formatPence, parsePounds } from '~~/shared/utils/price'
import { lineAmount, invoiceTotals, percentToBasisPoints, formatInvoiceNumber } from '~~/shared/utils/invoice'
import { toDateInputValue } from '~~/shared/utils/time'
import type { InvoiceDto, InvoiceSettingsDto, CustomerDto, InvoiceStatus } from '~~/shared/types/invoice'
import type { FlowerDto } from '~~/shared/types/flower'

const props = defineProps<{
  invoice?: InvoiceDto | null
  settings: InvoiceSettingsDto
  customers: CustomerDto[]
  flowers: FlowerDto[]
}>()

const emit = defineEmits<{
  saved: [invoice: InvoiceDto]
  cancel: []
}>()

const toast = useToast()
const isEdit = computed(() => !!props.invoice)

interface LineState {
  flowerId: string | null
  description: string
  quantity: number
  unitPricePounds: string
}

interface FormState {
  number: string
  status: InvoiceStatus
  issueDate: string // YYYY-MM-DD
  dueDate: string // YYYY-MM-DD
  taxPercent: string
  notes: string
  customerId: string // '' = new contact
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  saveContact: boolean
  lines: LineState[]
}

const penceToPounds = (pence?: number | null): string => (pence == null ? '' : (pence / 100).toFixed(2))

function blankLine(): LineState {
  return { flowerId: null, description: '', quantity: 1, unitPricePounds: '' }
}

function defaultState(): FormState {
  const now = Date.now()
  const due = now + props.settings.paymentTermsDays * 86_400_000
  return {
    number: '',
    status: 'draft',
    issueDate: toDateInputValue(now),
    dueDate: toDateInputValue(due),
    taxPercent: props.settings.taxRate ? String(props.settings.taxRate / 100) : '',
    notes: props.settings.footerNotes ?? '',
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    saveContact: true,
    lines: [blankLine()]
  }
}

const state = reactive<FormState>(defaultState())

// Seed from an existing invoice (edit). The edit page fetches async, so re-seed
// when the invoice arrives/changes.
watch(
  () => props.invoice?.id,
  () => {
    const inv = props.invoice
    if (!inv) {
      Object.assign(state, defaultState())
      return
    }
    state.number = inv.number
    state.status = inv.status
    state.issueDate = toDateInputValue(inv.issueDate)
    state.dueDate = toDateInputValue(inv.dueDate)
    state.taxPercent = inv.taxRate ? String(inv.taxRate / 100) : ''
    state.notes = inv.notes ?? ''
    state.customerId = inv.customerId ?? ''
    state.customerName = inv.customerName
    state.customerEmail = inv.customerEmail ?? ''
    state.customerPhone = inv.customerPhone ?? ''
    state.customerAddress = inv.customerAddress ?? ''
    state.saveContact = false
    state.lines = inv.lines.length
      ? inv.lines.map((l) => ({
          flowerId: l.flowerId,
          description: l.description,
          quantity: l.quantity,
          unitPricePounds: penceToPounds(l.unitPrice)
        }))
      : [blankLine()]
  },
  { immediate: true }
)

// ── Customer picker ─────────────────────────────────────────────────────────
// USelectMenu (a combobox) forbids an empty-string item value, so "New contact"
// uses a sentinel rather than ''. Internally state.customerId stays '' for a new
// contact (the save logic keys off that), and the select shows the sentinel.
const NEW_CONTACT = '__new__'
const customerItems = computed(() => [
  { label: 'New contact…', value: NEW_CONTACT },
  ...props.customers.map((c) => ({ label: c.name, value: c.id }))
])

function onCustomerChange(id: string) {
  if (id === NEW_CONTACT) {
    // Back to "new contact": clear for fresh entry.
    state.customerId = ''
    state.customerName = ''
    state.customerEmail = ''
    state.customerPhone = ''
    state.customerAddress = ''
    return
  }
  state.customerId = id
  const c = props.customers.find((x) => x.id === id)
  if (c) {
    state.customerName = c.name
    state.customerEmail = c.email ?? ''
    state.customerPhone = c.phone ?? ''
    state.customerAddress = c.address ?? ''
  }
}

// ── Lines ───────────────────────────────────────────────────────────────────
function addLine() {
  state.lines.push(blankLine())
}

function removeLine(index: number) {
  state.lines.splice(index, 1)
  if (!state.lines.length) state.lines.push(blankLine())
}

// Each line's description doubles as a flower picker: the dropdown suggests the
// grower's flowers (filtered as they type), but they can also just type anything.
// Picking a flower fills the description + unit price and links the flower id;
// it's a one-time copy (snapshot) — later flower edits never change the line.
const flowerMenuItems = computed(() =>
  props.flowers.map((f) => ({
    label: [f.name, f.variety, f.color].filter(Boolean).join(', '),
    id: f.id,
    price: penceToPounds(f.pricePerStem ?? f.pricePerBunch ?? null)
  }))
)

function onPickFlower(line: LineState, id: string | null | undefined) {
  const f = props.flowers.find((x) => x.id === id)
  if (!f) return
  line.flowerId = f.id
  line.description = [f.name, f.variety, f.color].filter(Boolean).join(', ')
  line.unitPricePounds = penceToPounds(f.pricePerStem ?? f.pricePerBunch ?? null)
}

// ── Live totals (pence) ─────────────────────────────────────────────────────
const taxBasisPoints = computed(() => percentToBasisPoints(state.taxPercent))

const lineAmountPence = (l: LineState): number =>
  lineAmount({ quantity: l.quantity || 0, unitPrice: parsePounds(l.unitPricePounds) ?? 0 })

const totals = computed(() =>
  invoiceTotals(
    state.lines.map((l) => ({ quantity: l.quantity || 0, unitPrice: parsePounds(l.unitPricePounds) ?? 0 })),
    taxBasisPoints.value
  )
)

// Placeholder for the auto-generated number on a new invoice.
const numberPreview = computed(() =>
  formatInvoiceNumber(
    props.settings.invoicePrefix,
    props.settings.nextInvoiceNumber,
    props.settings.numberPadding
  )
)

const statusItems = [
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' }
]

const saving = ref(false)

function validate(): string | null {
  if (!state.customerName.trim()) return 'Add a customer name.'
  const filled = state.lines.filter((l) => l.description.trim())
  if (!filled.length) return 'Add at least one line item with a description.'
  if (!state.issueDate) return 'Pick an issue date.'
  return null
}

async function save() {
  const error = validate()
  if (error) {
    toast.add({ title: error, color: 'error' })
    return
  }
  saving.value = true

  const lines = state.lines
    .filter((l) => l.description.trim())
    .map((l) => ({
      flowerId: l.flowerId,
      description: l.description.trim(),
      quantity: l.quantity || 0,
      unitPrice: parsePounds(l.unitPricePounds) ?? 0
    }))

  const body: Record<string, unknown> = {
    customerId: state.customerId || null,
    customerName: state.customerName.trim(),
    customerEmail: state.customerEmail.trim() || null,
    customerPhone: state.customerPhone.trim() || null,
    customerAddress: state.customerAddress.trim() || null,
    // Only save a brand-new typed contact (not when reusing a saved one).
    saveCustomer: !state.customerId && state.saveContact,
    status: state.status,
    issueDate: Date.parse(state.issueDate),
    dueDate: state.dueDate ? Date.parse(state.dueDate) : null,
    notes: state.notes.trim() || null,
    taxRate: taxBasisPoints.value,
    lines,
    // Omit on create to auto-generate; always send the (possibly edited) value on edit.
    number: state.number.trim() || (isEdit.value ? props.invoice!.number : undefined)
  }

  try {
    const url = isEdit.value ? `/api/invoices/${props.invoice!.id}` : '/api/invoices'
    const saved = await $fetch<InvoiceDto>(url, { method: isEdit.value ? 'PATCH' : 'POST', body })
    emit('saved', saved)
  } catch (e) {
    const message =
      typeof e === 'object' && e && 'statusMessage' in e && typeof e.statusMessage === 'string'
        ? e.statusMessage
        : 'Could not save. Please try again.'
    toast.add({ title: 'Save failed', description: message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UForm :state="state" class="flex flex-col gap-8" @submit.prevent="save">
    <!-- Customer -->
    <section class="flex flex-col gap-4">
      <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Bill to</h2>

      <UFormField v-if="customers.length" label="Saved contact">
        <USelectMenu
          :model-value="state.customerId || NEW_CONTACT"
          :items="customerItems"
          value-key="value"
          placeholder="New contact…"
          size="lg"
          class="w-full"
          @update:model-value="onCustomerChange"
        />
      </UFormField>

      <UFormField label="Customer name" required>
        <UInput
          v-model="state.customerName"
          placeholder="e.g. Petal & Stem Florist"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UFormField label="Email">
          <UInput
            v-model="state.customerEmail"
            type="email"
            placeholder="orders@florist.co.uk"
            autocapitalize="none"
            size="lg"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Phone">
          <UInput v-model="state.customerPhone" placeholder="07700 900000" size="lg" class="w-full" />
        </UFormField>
      </div>

      <UFormField label="Address">
        <UTextarea
          v-model="state.customerAddress"
          :rows="2"
          placeholder="Their billing address"
          class="w-full"
        />
      </UFormField>

      <USwitch
        v-if="!state.customerId"
        v-model="state.saveContact"
        label="Save to my contacts"
        description="Remember this contact for future invoices."
      />
    </section>

    <!-- Invoice details -->
    <section class="flex flex-col gap-4">
      <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Details</h2>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UFormField label="Invoice number" :help="isEdit ? undefined : 'Leave blank to auto-number.'">
          <UInput v-model="state.number" :placeholder="numberPreview" size="lg" class="w-full" />
        </UFormField>
        <UFormField label="Status">
          <USelect v-model="state.status" :items="statusItems" size="lg" class="w-full" />
        </UFormField>
        <UFormField label="Issue date" required>
          <UInput v-model="state.issueDate" type="date" size="lg" class="w-full" />
        </UFormField>
        <UFormField label="Due date">
          <UInput v-model="state.dueDate" type="date" size="lg" class="w-full" />
        </UFormField>
      </div>
    </section>

    <!-- Line items -->
    <section class="flex flex-col gap-4">
      <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Items</h2>

      <!-- Column header — reads like an invoice table -->
      <div
        class="flex items-center gap-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"
      >
        <span class="min-w-0 flex-1">Description</span>
        <span class="w-14 text-right">Qty</span>
        <span class="w-24 text-right">Price</span>
        <span class="hidden w-20 text-right sm:block">Amount</span>
        <span class="w-7 shrink-0"></span>
      </div>

      <div class="flex flex-col divide-y divide-default">
        <div v-for="(line, i) in state.lines" :key="i" class="flex items-center gap-2 py-2">
          <!-- Description doubles as a flower picker: suggests your flowers as you
               type, but you can type anything (reset-search-term-on-blur=false
               keeps free text). Picking a flower fills the price too. -->
          <UInputMenu
            v-model:search-term="line.description"
            :model-value="line.flowerId ?? undefined"
            :items="flowerMenuItems"
            label-key="label"
            value-key="id"
            :reset-search-term-on-blur="false"
            placeholder="Description, or pick a flower"
            icon="i-lucide-flower-2"
            class="min-w-0 flex-1"
            @update:model-value="onPickFlower(line, $event)"
          >
            <template #item="{ item }">
              <span class="flex w-full items-center gap-2">
                <span class="truncate">{{ item.label }}</span>
                <span v-if="item.price" class="ml-auto shrink-0 text-muted">£{{ item.price }}</span>
              </span>
            </template>
          </UInputMenu>
          <UInput
            v-model.number="line.quantity"
            type="number"
            inputmode="decimal"
            min="0"
            step="any"
            class="w-14"
            :ui="{ base: 'text-right' }"
          />
          <UInput
            v-model="line.unitPricePounds"
            type="number"
            inputmode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            class="w-24"
          >
            <template #leading><span class="text-muted">£</span></template>
          </UInput>
          <span class="hidden w-20 text-right text-sm font-medium tabular-nums text-default sm:block">
            {{ formatPence(lineAmountPence(line)) }}
          </span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Remove line"
            class="w-7 shrink-0"
            @click="removeLine(i)"
          />
        </div>
      </div>

      <UButton
        icon="i-lucide-plus"
        label="Add line"
        color="neutral"
        variant="soft"
        size="lg"
        class="self-start rounded-full"
        @click="addLine"
      />
    </section>

    <!-- Totals -->
    <section class="flex flex-col items-end gap-2">
      <div class="flex w-full max-w-xs items-center justify-between text-sm">
        <span class="text-muted">Subtotal</span>
        <span class="tabular-nums">{{ formatPence(totals.subtotal) }}</span>
      </div>
      <div class="flex w-full max-w-xs items-end justify-between gap-3 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-muted">VAT</span>
          <UInput
            v-model="state.taxPercent"
            type="number"
            inputmode="decimal"
            step="0.1"
            min="0"
            placeholder="0"
            size="xs"
            class="w-16"
          >
            <template #trailing><span class="text-xs text-muted">%</span></template>
          </UInput>
        </div>
        <span class="tabular-nums">{{ formatPence(totals.taxAmount) }}</span>
      </div>
      <div
        class="flex w-full max-w-xs items-center justify-between border-t border-default pt-2 text-base font-semibold"
      >
        <span>Total</span>
        <span class="tabular-nums">{{ formatPence(totals.total) }}</span>
      </div>
    </section>

    <!-- Notes -->
    <UFormField label="Notes" help="Shown on the invoice (payment terms, thanks, etc.).">
      <UTextarea v-model="state.notes" :rows="3" placeholder="Thanks for your order!" class="w-full" />
    </UFormField>

    <!-- Actions -->
    <div
      class="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-default bg-default/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur"
    >
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        label="Cancel"
        class="shrink-0"
        :disabled="saving"
        @click="emit('cancel')"
      />
      <UButton
        type="submit"
        color="primary"
        :label="isEdit ? 'Save changes' : 'Create invoice'"
        icon="i-lucide-check"
        size="lg"
        block
        class="flex-1"
        :loading="saving"
      />
    </div>
  </UForm>
</template>
