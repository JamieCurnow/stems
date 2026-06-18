<script setup lang="ts">
// Add / edit flower form. Renders inside a UDrawer (bottom sheet) on mobile and
// a UModal on desktop. The parent (/flowers) owns the open state via
// v-model:open and the flower being edited (null = add). On a successful save
// the parent receives the fresh FlowerDto via @saved and closes the sheet.
//
// Prices are pence end-to-end; we only convert at the <input> boundary here via
// parsePounds(). Bunch price auto-derives live (greyed placeholder) and is only
// persisted when the grower explicitly overrides it.
//
// Photos: growers can add a gallery via <GalleryUploader>, which manages an
// ordered list of R2 keys (cover first). We send the full desired set as
// photoKeys on save; the server replaces the flower's photos with that set.

import { UModal, UDrawer } from '#components'
import { bunchPrice, formatPence, parsePounds } from '~~/shared/utils/price'
import type { FlowerDto } from '~~/shared/types/flower'

const props = defineProps<{
  /** The flower to edit, or null/undefined to add a new one. */
  flower?: FlowerDto | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  saved: [flower: FlowerDto]
}>()

const toast = useToast()

// Drawer (mobile) vs modal (desktop). useMediaQuery resolves to false during
// SSR but evaluates synchronously on the client, which would mismatch hydration
// on wide viewports. Gate on a mounted flag so the first client render matches
// the server (drawer), then switch to the real breakpoint once mounted.
const isDesktop = useMediaQuery('(min-width: 640px)')
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
const layout = computed(() => (mounted.value && isDesktop.value ? UModal : UDrawer))

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
  stemsAvailable: number | null
  notes: string
  photoKeys: string[]
}

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

// Re-seed the form whenever it opens (or the target flower changes).
watch(
  () => [open.value, props.flower?.id] as const,
  ([isOpen]) => {
    if (!isOpen) return
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

const title = computed(() => (isEdit.value ? 'Edit flower' : 'Add a flower'))

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
    open.value = false
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
  <component :is="layout" v-model:open="open" :title="title">
    <template #body>
      <UForm :state="state" class="flex flex-col gap-5 pb-2" @submit.prevent="save">
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

        <UFormField
          label="Stems available"
          help="How many stems you have now. Leave blank for “Available”, or set 0 if sold out."
        >
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

        <UFormField label="Notes">
          <UTextarea
            v-model="state.notes"
            :rows="3"
            :maxlength="300"
            placeholder="Anything buyers should know"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex w-full items-center gap-3">
        <UButton color="neutral" variant="ghost" label="Cancel" class="shrink-0" @click="open = false" />
        <UButton
          color="primary"
          :label="isEdit ? 'Save changes' : 'Add flower'"
          icon="i-lucide-check"
          size="lg"
          block
          class="flex-1"
          :loading="saving"
          :disabled="saving || uploading"
          @click="save"
        />
      </div>
    </template>
  </component>
</template>
