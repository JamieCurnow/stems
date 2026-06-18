<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import type { ProfileRow } from '~~/server/db/schema'
import { normaliseHandle, validateHandle } from '~~/shared/utils/handle'

// Any signed-in user can reach this; the onboarding middleware bounces people
// who already have a profile back to /discover.
definePageMeta({ layout: 'default', middleware: ['auth', 'onboarding'] })

useSeoMeta({ title: 'Claim your Stems page', robots: 'noindex,nofollow' })

const { set } = useProfile()

const state = reactive({
  handle: '',
  farmName: '',
  locationName: '',
  postcode: '',
  isGrower: true
})

const submitting = ref(false)
const formError = ref<string | null>(null)

// ── Live handle availability ───────────────────────────────────────────────
type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
const handleStatus = ref<HandleStatus>('idle')
const handleMessage = ref<string | null>(null)

watchDebounced(
  () => state.handle,
  async (raw) => {
    handleMessage.value = null
    const trimmed = raw.trim()
    if (!trimmed) {
      handleStatus.value = 'idle'
      return
    }

    const formatError = validateHandle(trimmed)
    if (formatError) {
      handleStatus.value = 'invalid'
      handleMessage.value = formatError
      return
    }

    handleStatus.value = 'checking'
    try {
      const res = await $fetch<{ available: boolean; error?: string }>('/api/profile/handle-available', {
        query: { handle: trimmed }
      })
      // Ignore stale responses if the field changed while we were waiting.
      if (normaliseHandle(state.handle) !== normaliseHandle(trimmed)) return
      if (res.error) {
        handleStatus.value = 'invalid'
        handleMessage.value = res.error
      } else if (res.available) {
        handleStatus.value = 'available'
        handleMessage.value = 'That username is free.'
      } else {
        handleStatus.value = 'taken'
        handleMessage.value = 'That username is taken.'
      }
    } catch {
      handleStatus.value = 'idle'
      handleMessage.value = null
    }
  },
  { debounce: 400 }
)

const canSubmit = computed(
  () => state.farmName.trim().length > 0 && handleStatus.value === 'available' && !submitting.value
)

async function submit() {
  formError.value = null
  submitting.value = true
  try {
    const created = await $fetch<ProfileRow>('/api/profile', {
      method: 'POST',
      body: {
        handle: state.handle,
        farmName: state.farmName,
        locationName: state.locationName || undefined,
        postcode: state.postcode || undefined,
        isGrower: state.isGrower
      }
    })
    // Populate the shared state so the tab bar reflects isGrower without reload.
    set(created)
    await navigateTo('/account')
  } catch (e) {
    const message =
      typeof e === 'object' && e && 'statusMessage' in e && typeof e.statusMessage === 'string'
        ? e.statusMessage
        : 'Something went wrong. Please try again.'
    formError.value = message
    // A handle race invalidates the live check — nudge them to pick another.
    if (/taken/i.test(message)) handleStatus.value = 'taken'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-md px-4 py-10">
    <header class="mb-7 text-center">
      <h1 class="font-display text-3xl font-medium text-default">Claim your Stems page</h1>
      <p class="mt-2 text-sm text-muted">
        This is your shareable link —
        <span class="font-medium text-primary"
          >stems.app/@{{ normaliseHandle(state.handle) || 'yourname' }}</span
        >
      </p>
    </header>

    <UForm :state="state" class="flex flex-col gap-5" @submit="submit">
      <UFormField label="Username" required help="3–30 characters, letters, numbers and underscores.">
        <UInput
          v-model="state.handle"
          placeholder="yourname"
          autocapitalize="none"
          autocomplete="off"
          spellcheck="false"
          class="w-full"
          :ui="{ leading: 'ps-3' }"
        >
          <template #leading>
            <span class="text-muted">@</span>
          </template>
          <template #trailing>
            <UIcon
              v-if="handleStatus === 'checking'"
              name="i-lucide-loader-circle"
              class="size-4 animate-spin text-muted"
            />
            <UIcon
              v-else-if="handleStatus === 'available'"
              name="i-lucide-check"
              class="size-4 text-success"
            />
            <UIcon
              v-else-if="handleStatus === 'taken' || handleStatus === 'invalid'"
              name="i-lucide-x"
              class="size-4 text-error"
            />
          </template>
        </UInput>
        <p
          v-if="handleMessage"
          class="mt-1.5 text-xs"
          :class="handleStatus === 'available' ? 'text-success' : 'text-error'"
        >
          {{ handleMessage }}
        </p>
      </UFormField>

      <UFormField label="Farm or display name" required>
        <UInput v-model="state.farmName" placeholder="e.g. Bramble & Bloom" maxlength="80" class="w-full" />
      </UFormField>

      <UFormField label="Location" help="Where you grow — shown on your page.">
        <UInput v-model="state.locationName" placeholder="e.g. Bissoe, Cornwall" class="w-full" />
      </UFormField>

      <UFormField label="Postcode" help="Optional. Helps buyers find growers nearby (coming soon).">
        <UInput
          v-model="state.postcode"
          placeholder="e.g. TR4 8QZ"
          autocapitalize="characters"
          class="w-full"
        />
      </UFormField>

      <div class="flex items-start justify-between gap-4 rounded-xl bg-muted px-4 py-3.5">
        <div>
          <p class="text-sm font-medium text-default">I grow flowers and want to list them</p>
          <p class="text-xs text-muted">You can change this later from your account.</p>
        </div>
        <USwitch v-model="state.isGrower" />
      </div>

      <p v-if="formError" class="text-sm text-error">{{ formError }}</p>

      <UButton
        type="submit"
        :loading="submitting"
        :disabled="!canSubmit"
        block
        size="lg"
        class="mt-1 font-medium"
      >
        Create my page
      </UButton>
    </UForm>
  </div>
</template>
