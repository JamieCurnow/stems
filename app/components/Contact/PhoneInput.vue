<template>
  <UFieldGroup>
    <USelectMenu
      v-model="dialCode"
      :items="dialCodeOptions"
      :disabled="disabled"
      :size="size"
      :search-input="{ placeholder: 'Search code…', icon: 'i-lucide-search' }"
      :ui="{ content: 'w-40' }"
      class="shrink-0"
    />
    <UInput
      :model-value="nationalNumber"
      :disabled="disabled"
      :size="size"
      type="tel"
      inputmode="numeric"
      autocomplete="tel-national"
      :placeholder="placeholder"
      class="w-full"
      @update:model-value="onNationalInput"
    />
  </UFieldGroup>
</template>

<script setup lang="ts">
import { DEFAULT_DIAL_CODE, dialCodeOptions, splitE164 } from '~/utils/phoneDialCodes'

const props = withDefaults(
  defineProps<{
    /** Dial code to seed the picker with when there's no value yet. */
    defaultDialCode?: string
    disabled?: boolean
    placeholder?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
  }>(),
  {
    defaultDialCode: DEFAULT_DIAL_CODE,
    disabled: false,
    placeholder: 'Phone number',
    size: 'lg'
  }
)

// The full E.164 string, e.g. "+447911123456". Two-way bound by the parent.
const model = defineModel<string>({ default: '' })

const emit = defineEmits<{
  /** Split parts + a mask-only validity flag, for parents that want them. */
  data: [{ isValid: boolean; dialCode: string; nationalNumber: string }]
}>()

// Drop a leading national trunk zero (e.g. UK "07700…" → "7700…"). The dial code
// is supplied separately, so the trunk zero would otherwise corrupt the E.164
// ("+4407700…") — the exact "wrong country code" failure wa.me throws.
const stripNational = (value: string | number) => String(value).replace(/\D/g, '').replace(/^0+/, '')

// Seed the two halves from any initial value, falling back to the configured code.
const seed = splitE164(model.value, props.defaultDialCode)
const dialCode = ref(seed.dialCode)
const nationalNumber = ref(stripNational(seed.nationalNumber))

// Mask-only validity: we don't check per-country rules, just a plausible length
// (E.164 allows up to 15 digits including the code).
const isValid = computed(() => {
  const len = nationalNumber.value.length
  return len >= 6 && len <= 14
})

const e164 = computed(() => (nationalNumber.value ? `${dialCode.value}${nationalNumber.value}` : ''))

const onNationalInput = (value: string | number) => {
  nationalNumber.value = stripNational(value)
}

// Push every change up: keep the parent's E.164 model in sync and emit the
// split parts + validity for consumers that store the dial code separately.
watch(
  [dialCode, nationalNumber],
  () => {
    model.value = e164.value
    emit('data', { isValid: isValid.value, dialCode: dialCode.value, nationalNumber: nationalNumber.value })
  },
  { immediate: true }
)

// Re-seed when the parent sets the value externally (e.g. profile form hydrate).
// Guards prevent a feedback loop when the change originated from our own watcher.
watch(model, (value) => {
  const next = splitE164(value, props.defaultDialCode)
  const national = stripNational(next.nationalNumber)
  if (next.dialCode !== dialCode.value) dialCode.value = next.dialCode
  if (national !== nationalNumber.value) nationalNumber.value = national
})

// Follow the default dial code until the user has typed a number.
watch(
  () => props.defaultDialCode,
  (next) => {
    if (next && !nationalNumber.value) dialCode.value = next
  }
)
</script>
