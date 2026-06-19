<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const consent = useConsent()

const analytics = ref(false)
const marketing = ref(false)

// Re-seed switches every time the dialog opens so users see their current
// stored choice — not whatever the previous open left in the refs.
watch(open, (v) => {
  if (v) {
    analytics.value = consent.state.value.analytics
    marketing.value = consent.state.value.marketing
  }
})

function save() {
  consent.set({ analytics: analytics.value, marketing: marketing.value })
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" title="Cookie preferences">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Choose which categories of cookies you're happy with. Strictly functional cookies are always on -
          without them sign-in and billing wouldn't work.
        </p>

        <div
          class="flex items-start justify-between gap-4 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
        >
          <div>
            <p class="text-sm font-medium">Strictly functional</p>
            <p class="mt-0.5 text-xs text-neutral-500">Sign-in session, billing flow, security.</p>
          </div>
          <USwitch :model-value="true" disabled />
        </div>

        <div
          class="flex items-start justify-between gap-4 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
        >
          <div>
            <p class="text-sm font-medium">Analytics</p>
            <p class="mt-0.5 text-xs text-neutral-500">
              Anonymised usage metrics so we can improve the product.
            </p>
          </div>
          <USwitch v-model="analytics" />
        </div>

        <div
          class="flex items-start justify-between gap-4 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
        >
          <div>
            <p class="text-sm font-medium">Marketing</p>
            <p class="mt-0.5 text-xs text-neutral-500">Ad measurement and personalisation.</p>
          </div>
          <USwitch v-model="marketing" />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
        <UButton color="neutral" @click="save">Save preferences</UButton>
      </div>
    </template>
  </UModal>
</template>
