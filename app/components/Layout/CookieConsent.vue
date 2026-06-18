<script setup lang="ts">
const consent = useConsent()
const manageOpen = ref(false)

function openManage() {
  manageOpen.value = true
}
</script>

<template>
  <div
    v-if="!consent.decided.value"
    class="fixed inset-x-4 bottom-4 z-50 max-w-2xl rounded-xl border border-neutral-200 bg-white p-4 shadow-lg sm:left-auto sm:right-4 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900"
    role="dialog"
    aria-live="polite"
    aria-label="Cookie consent"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-300">
      We use cookies to make the app work, measure usage, and (with your permission) personalise marketing.
      You can change your choice any time from the cookies page.
    </p>
    <div class="mt-4 flex flex-wrap items-center gap-2">
      <UButton size="sm" color="neutral" variant="solid" @click="consent.acceptAll()"> Accept all </UButton>
      <UButton size="sm" color="neutral" variant="soft" @click="consent.rejectAll()">
        Reject non-essential
      </UButton>
      <UButton size="sm" color="neutral" variant="ghost" @click="openManage"> Manage </UButton>
    </div>

    <LayoutConsentManageDialog v-model:open="manageOpen" />
  </div>
</template>
