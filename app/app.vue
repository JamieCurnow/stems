<script setup lang="ts">
// Identity sync runs client-only — pushes set_user_id / set_user_properties
// to the dataLayer when the session or billing status changes.
if (import.meta.client) await useAnalyticsIdentity()
</script>

<template>
  <UApp>
    <VitePwaManifest />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <LayoutCookieConsent />
  </UApp>
</template>
