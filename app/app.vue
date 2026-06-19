<template>
  <UApp>
    <VitePwaManifest />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Consent banner kept dormant: it only sets a first-party cookie via
         useConsent (no third-party tags wired yet). Ready for PostHog. -->
    <LayoutCookieConsent />
  </UApp>
</template>
