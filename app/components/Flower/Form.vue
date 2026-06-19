<script setup lang="ts">
// Add / edit flower form. Rendered inline on a dedicated page (/flowers/new and
// /flowers/[id]/edit) — it owns no chrome of its own beyond the form fields and
// the action row. On a successful save the page receives the fresh FlowerDto via
// @saved; Cancel emits @cancel so the page can navigate back.
//
// Prices are pence end-to-end; we only convert at the <input> boundary here via
// parsePounds(). Bunch price auto-derives live (greyed placeholder) and is only
// persisted when the grower explicitly overrides it.
//
// Photos: growers can add a gallery via <GalleryUploader>, which manages an
// ordered list of R2 keys (cover first). We send the full desired set as
// photoKeys on save; the server replaces the flower's photos with that set.

import { bunchPrice, formatPence, parsePounds } from '~~/shared/utils/price'
import { AVAILABILITY_STATUSES, type AvailabilityStatus } from '~~/shared/utils/flowers'
import type { FlowerDto } from '~~/shared/types/flower'

const props = defineProps<{
  /** The flower to edit, or null/undefined to add a new one. */
  flower?: FlowerDto | null
}>()

const emit = defineEmits<{
  saved: [flower: FlowerDto]
  cancel: []
}>()

const toast = useToast()

const isEdit = computed(() => !!props.flower)

// Local form state. Prices are kept as pounds strings for the inputs.
interface FormState {
  name: string
  variety: string
  color: string
  stemLengthCm: number | null
  stemsPerBunch: number | null
  // Held as strings from the number inputs; parsed via parsePounds() on submit.
  pricePerStemPounds: string
  pricePerBunchPounds: string
  openToOffers: boolean
  availabilityStatus: AvailabilityStatus | null
  stemsAvailable: number | null
  notes: string
  photoKeys: string[]
}

// Status options for the select, plus a leading "No status" to clear it.
const statusItems = [
  { label: 'No status', value: null },
  ...AVAILABILITY_STATUSES.map((s) => ({ label: s.label, value: s.value }))
]

// FlowerDto exposes resolved /img URLs, not raw R2 keys, but imgUrl() is a
// lossless transform (public/x.webp ↔ /img/x.webp), so we can reverse it to get
// back the keys the API expects on save.
const urlToKey = (url: string): string => `public/${url.replace(/^\/img\//, '')}`

const penceToPounds = (pence?: number | null): string => (pence == null ? '' : (pence / 100).toFixed(2))

// Inputs may hold a string ('' when blank) or a number (UInput type="number").
const isFilled = (v: string | number | null | undefined): boolean => String(v ?? '').trim().length > 0

function blank(): FormState {
  return {
    name: '',
    variety: '',
    color: '',
    stemLengthCm: null,
    stemsPerBunch: null,
    pricePerStemPounds: '',
    pricePerBunchPounds: '',
    openToOffers: false,
    availabilityStatus: null,
    stemsAvailable: null,
    notes: '',
    photoKeys: []
  }
}

const state = reactive<FormState>(blank())

// Track whether the grower has explicitly overridden the bunch price, so we
// only persist it when they have (else null → derived on read).
const bunchOverridden = ref(false)
function onBunchInput() {
  bunchOverridden.value = isFilled(state.pricePerBunchPounds)
}

// Seed the form from the target flower (and re-seed if it loads/changes — the
// edit page fetches the flower async, so props.flower arrives after mount).
watch(
  () => props.flower?.id,
  () => {
    const f = props.flower
    if (f) {
      state.name = f.name
      state.variety = f.variety ?? ''
      state.color = f.color ?? ''
      state.stemLengthCm = f.stemLengthCm
      state.stemsPerBunch = f.stemsPerBunch
      state.pricePerStemPounds = penceToPounds(f.pricePerStem)
      // Only seed an explicit override (derived value stays as placeholder).
      const explicit = f.pricePerBunch != null && f.pricePerBunch !== derivedBunchPence(f)
      state.pricePerBunchPounds = explicit ? penceToPounds(f.pricePerBunch) : ''
      bunchOverridden.value = explicit
      state.openToOffers = f.openToOffers
      state.availabilityStatus = f.availabilityStatus
      state.stemsAvailable = f.stemsAvailable
      state.notes = f.notes ?? ''
      state.photoKeys = (f.photoUrls ?? []).map(urlToKey) // existing gallery, cover first
    } else {
      Object.assign(state, blank())
      bunchOverridden.value = false
    }
  },
  { immediate: true }
)

function derivedBunchPence(f: {
  pricePerStem?: number | null
  stemsPerBunch?: number | null
}): number | null {
  if (f.pricePerStem != null && f.stemsPerBunch != null) return f.pricePerStem * f.stemsPerBunch
  return null
}

// Live derived bunch total for the placeholder.
const derivedBunchLabel = computed(() => {
  const stem = parsePounds(state.pricePerStemPounds)
  const derived = bunchPrice({
    pricePerStem: stem,
    stemsPerBunch: state.stemsPerBunch,
    pricePerBunch: null
  })
  return derived != null ? formatPence(derived) : '£0.00'
})

const uploading = ref(false)
const saving = ref(false)

async function save() {
  if (!state.name.trim()) {
    toast.add({ title: 'Give your flower a name', color: 'error' })
    return
  }
  saving.value = true

  // Build the body. Empty strings → null; pounds → pence at this boundary.
  const body: Record<string, unknown> = {
    name: state.name.trim(),
    variety: state.variety.trim() || null,
    color: state.color.trim() || null,
    stemLengthCm: state.stemLengthCm,
    stemsPerBunch: state.stemsPerBunch,
    pricePerStem: isFilled(state.pricePerStemPounds) ? parsePounds(state.pricePerStemPounds) : null,
    pricePerBunch: bunchOverridden.value ? parsePounds(state.pricePerBunchPounds) : null,
    openToOffers: state.openToOffers,
    availabilityStatus: state.availabilityStatus,
    stemsAvailable: state.stemsAvailable,
    notes: state.notes.trim() || null,
    // The gallery holds the full desired set (kept + added, cover first); the
    // server replaces the flower's photos with it. Safe on edit too: existing
    // keys are reversed from photoUrls when the form opens.
    photoKeys: [...state.photoKeys]
  }

  try {
    const url = isEdit.value ? `/api/flowers/${props.flower!.id}` : '/api/flowers'
    const saved = await $fetch<FlowerDto>(url, {
      method: isEdit.value ? 'PATCH' : 'POST',
      body
    })
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
  <UForm :state="state" class="flex flex-col gap-5" @submit.prevent="save">
    <!-- Photos -->
    <UFormField label="Photos" help="Add up to 8. The cover shows first in your shop.">
      <ImageGalleryUploader
        v-model="state.photoKeys"
        :max-size="1280"
        :max="8"
        @uploading="uploading = $event"
      />
    </UFormField>

    <UFormField label="Name" required>
      <UInput v-model="state.name" placeholder="e.g. Cosmos" size="lg" class="w-full" />
    </UFormField>

    <UFormField label="Variety">
      <UInput v-model="state.variety" placeholder="e.g. Cupcake White" size="lg" class="w-full" />
    </UFormField>

    <UFormField label="Colour">
      <UInput v-model="state.color" placeholder="e.g. Blush pink" size="lg" class="w-full" />
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Approx. length (cm)">
        <UInput
          v-model.number="state.stemLengthCm"
          type="number"
          inputmode="numeric"
          min="0"
          placeholder="e.g. 60"
          size="lg"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Stems / bunch">
        <UInput
          v-model.number="state.stemsPerBunch"
          type="number"
          inputmode="numeric"
          min="0"
          placeholder="10"
          size="lg"
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Price / stem">
        <UInput
          v-model="state.pricePerStemPounds"
          type="number"
          inputmode="decimal"
          step="0.01"
          min="0"
          placeholder="0.85"
          size="lg"
          class="w-full"
        >
          <template #leading>
            <span class="text-muted">£</span>
          </template>
        </UInput>
      </UFormField>
      <UFormField label="Price / bunch" help="Leave blank to auto-calculate.">
        <UInput
          v-model="state.pricePerBunchPounds"
          type="number"
          inputmode="decimal"
          step="0.01"
          min="0"
          :placeholder="derivedBunchLabel"
          size="lg"
          class="w-full"
          @input="onBunchInput"
        >
          <template #leading>
            <span class="text-muted">£</span>
          </template>
        </UInput>
      </UFormField>
    </div>

    <UFormField>
      <USwitch
        v-model="state.openToOffers"
        label="Open to offers"
        description="Show buyers you’ll consider offers, not just the listed price."
      />
    </UFormField>

    <!-- Availability: a categorical status and/or a stem count — both optional,
         set whichever you like. -->
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Status" help="An at-a-glance hint.">
        <USelect
          v-model="state.availabilityStatus"
          :items="statusItems"
          placeholder="No status"
          size="lg"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Stems available" help="Leave blank, or 0 if sold out.">
        <UInput
          v-model.number="state.stemsAvailable"
          type="number"
          inputmode="numeric"
          min="0"
          placeholder="e.g. 120"
          size="lg"
          class="w-full"
        >
          <template #trailing>
            <span class="text-sm text-muted">stems</span>
          </template>
        </UInput>
      </UFormField>
    </div>

    <UFormField label="Notes">
      <UTextarea
        v-model="state.notes"
        :rows="3"
        :maxlength="300"
        placeholder="Anything buyers should know"
        class="w-full"
      />
    </UFormField>

    <!-- Actions: sticky to the bottom of the viewport so save stays in reach on
         a long form, clearing the fixed tab bar + iOS safe area. -->
    <div
      class="sticky bottom-0 z-10 -mx-4 mt-2 flex items-center gap-3 border-t border-default bg-default/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur"
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
        :label="isEdit ? 'Save changes' : 'Add flower'"
        icon="i-lucide-check"
        size="lg"
        block
        class="flex-1"
        :loading="saving"
        :disabled="saving || uploading"
      />
    </div>
  </UForm>
</template>
