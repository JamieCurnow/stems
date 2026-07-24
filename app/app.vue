<script setup lang="ts">
// Site-wide SEO baseline. Runs on every route, so every page inherits these
// unless its own useSeoMeta overrides them (last write wins) — e.g. the grower
// page keeps its dynamic banner OG image while everything else falls back to
// the static /og.png. nuxt-seo-utils handles the title template + canonical.
const site = useSiteConfig()

useSeoMeta({
  ogSiteName: 'Stems',
  ogType: 'website',
  ogImage: `${site.url}/og.png`,
  twitterCard: 'summary_large_image',
  twitterImage: `${site.url}/og.png`
})

// Company-level structured data. Complements (does not replace) the per-grower
// LocalBusiness/Person JSON-LD on @[handle] — they describe different entities.
// Operating entity per privacy.vue: Guardline Ltd, England & Wales, 13323382.
useSchemaOrg([
  defineOrganization({
    name: 'Stems',
    legalName: 'Guardline Ltd',
    url: 'https://stems.market',
    logo: 'https://stems.market/logo.svg',
    email: 'hello@stems.market',
    description: 'The marketplace for local-grown flowers.'
  }),
  defineWebSite({
    name: 'Stems',
    inLanguage: 'en-GB'
  })
])

// Keep GA4 user_id + is_grower user property (and PostHog identity) in sync
// with the current session. Client-only — analytics is client-side and
// awaiting useSession during SSR would block hydration.
if (import.meta.client) await useAnalyticsIdentity()
</script>

<template>
  <UApp>
    <VitePwaManifest />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Cookie banner: writes the first-party consent cookie and drives GA4
         Consent Mode v2 + PostHog opt-in via useConsent. -->
    <LayoutCookieConsent />
  </UApp>
</template>
