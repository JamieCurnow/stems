<script setup lang="ts">
// Invoice settings — the grower's "from" header, bank/payment details and
// numbering defaults used on every invoice. Grower-only. Upserts to
// /api/invoice-settings (PUT).

import { percentToBasisPoints } from '~~/shared/utils/invoice'
import type { InvoiceSettingsDto } from '~~/shared/types/invoice'

definePageMeta({ middleware: ['auth', 'onboarding'], layout: 'app' })

useSeoMeta({ title: 'Invoice settings', robots: 'noindex,nofollow' })

const toast = useToast()
const { profile } = useProfile()
watchEffect(() => {
  if (profile.value && !profile.value.isGrower) navigateTo('/account')
})

const settings = await useRequestFetch()<InvoiceSettingsDto>('/api/invoice-settings')

// ImageUploader works in R2 keys; the DTO gives a resolved /img URL. Reverse it.
const urlToKey = (url: string | null): string | undefined =>
  url ? `public/${url.replace(/^\/img\//, '')}` : undefined
const logoKey = ref<string | undefined>(urlToKey(settings.logoUrl))

const state = reactive({
  businessName: settings.businessName ?? '',
  email: settings.email ?? '',
  phone: settings.phone ?? '',
  address: settings.address ?? '',
  vatNumber: settings.vatNumber ?? '',
  bankName: settings.bankName ?? '',
  accountName: settings.accountName ?? '',
  accountNumber: settings.accountNumber ?? '',
  sortCode: settings.sortCode ?? '',
  paymentNotes: settings.paymentNotes ?? '',
  taxPercent: settings.taxRate ? String(settings.taxRate / 100) : '',
  invoicePrefix: settings.invoicePrefix,
  nextInvoiceNumber: settings.nextInvoiceNumber,
  numberPadding: settings.numberPadding,
  paymentTermsDays: settings.paymentTermsDays,
  footerNotes: settings.footerNotes ?? ''
})

const uploading = ref(false)
const saving = ref(false)

async function save() {
  saving.value = true
  try {
    await $fetch<InvoiceSettingsDto>('/api/invoice-settings', {
      method: 'PUT',
      body: {
        businessName: state.businessName,
        email: state.email,
        phone: state.phone,
        address: state.address,
        vatNumber: state.vatNumber,
        bankName: state.bankName,
        accountName: state.accountName,
        accountNumber: state.accountNumber,
        sortCode: state.sortCode,
        paymentNotes: state.paymentNotes,
        taxRate: percentToBasisPoints(state.taxPercent),
        invoicePrefix: state.invoicePrefix,
        nextInvoiceNumber: state.nextInvoiceNumber,
        numberPadding: state.numberPadding,
        paymentTermsDays: state.paymentTermsDays,
        footerNotes: state.footerNotes,
        logoKey: logoKey.value ?? null
      }
    })
    toast.add({ title: 'Invoice settings saved', color: 'success' })
    await navigateTo('/invoices')
  } catch (e) {
    const message =
      typeof e === 'object' && e && 'statusMessage' in e && typeof e.statusMessage === 'string'
        ? e.statusMessage
        : 'Could not save your settings. Please try again.'
    toast.add({ title: message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-md px-4 py-6">
    <header class="mb-6 flex items-center gap-2">
      <UButton
        to="/invoices"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Back to invoices"
      />
      <h1 class="font-display text-2xl font-medium text-default">Invoice settings</h1>
    </header>

    <UForm :state="state" class="flex flex-col gap-6" @submit="save">
      <!-- Your business -->
      <section class="flex flex-col gap-5">
        <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Your business</h2>

        <div>
          <p class="mb-2 text-sm font-medium text-default">Logo</p>
          <p class="mb-2 text-xs text-muted">Optional. Shown at the top of every invoice.</p>
          <ImageUploader v-model="logoKey" :max-size="512" label="Add logo" @uploading="uploading = $event" />
        </div>

        <UFormField label="Business name" help="Defaults to your farm name if left blank.">
          <UInput v-model="state.businessName" placeholder="e.g. Bramble & Bloom" class="w-full" />
        </UFormField>

        <UFormField label="Address">
          <UTextarea v-model="state.address" :rows="3" placeholder="Your business address" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField label="Email">
            <UInput v-model="state.email" type="email" autocapitalize="none" class="w-full" />
          </UFormField>
          <UFormField label="Phone">
            <UInput v-model="state.phone" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="VAT number" help="Leave blank if you're not VAT registered.">
          <UInput v-model="state.vatNumber" placeholder="GB123456789" class="w-full" />
        </UFormField>
      </section>

      <!-- Payment details -->
      <section class="flex flex-col gap-5">
        <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Payment details</h2>
        <p class="-mt-3 text-xs text-muted">Printed on invoices so customers know how to pay you.</p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField label="Bank name">
            <UInput v-model="state.bankName" class="w-full" />
          </UFormField>
          <UFormField label="Account name">
            <UInput v-model="state.accountName" class="w-full" />
          </UFormField>
          <UFormField label="Sort code">
            <UInput v-model="state.sortCode" placeholder="00-00-00" class="w-full" />
          </UFormField>
          <UFormField label="Account number">
            <UInput v-model="state.accountNumber" placeholder="12345678" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Other payment notes" help="IBAN, PayPal, terms - anything else.">
          <UTextarea v-model="state.paymentNotes" :rows="2" class="w-full" />
        </UFormField>
      </section>

      <!-- Defaults -->
      <section class="flex flex-col gap-5">
        <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Defaults</h2>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField label="Number prefix" help='e.g. "INV-"'>
            <UInput v-model="state.invoicePrefix" placeholder="INV-" class="w-full" />
          </UFormField>
          <UFormField label="Next number">
            <UInput v-model.number="state.nextInvoiceNumber" type="number" min="1" class="w-full" />
          </UFormField>
          <UFormField label="Number padding" help="Zero-pad width (4 → 0001).">
            <UInput v-model.number="state.numberPadding" type="number" min="0" max="8" class="w-full" />
          </UFormField>
          <UFormField label="Payment terms" help="Days until due.">
            <UInput v-model.number="state.paymentTermsDays" type="number" min="0" class="w-full">
              <template #trailing><span class="text-sm text-muted">days</span></template>
            </UInput>
          </UFormField>
        </div>

        <UFormField label="Default VAT rate" help="Leave at 0 if you're not VAT registered.">
          <UInput
            v-model="state.taxPercent"
            type="number"
            inputmode="decimal"
            step="0.1"
            min="0"
            placeholder="0"
            class="w-full"
          >
            <template #trailing><span class="text-sm text-muted">%</span></template>
          </UInput>
        </UFormField>

        <UFormField label="Default invoice note" help="Pre-filled on each new invoice.">
          <UTextarea
            v-model="state.footerNotes"
            :rows="2"
            placeholder="Thanks for your order!"
            class="w-full"
          />
        </UFormField>
      </section>

      <UButton
        type="submit"
        label="Save settings"
        icon="i-lucide-check"
        block
        size="lg"
        class="mt-1 font-medium"
        :loading="saving"
        :disabled="uploading || saving"
      />
    </UForm>
  </div>
</template>
