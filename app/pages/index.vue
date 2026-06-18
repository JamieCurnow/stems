<script setup lang="ts">
// V1 has no standalone marketing home yet — the entry point is the public
// /discover page (also the PWA start_url). Redirect there. A dedicated Stems
// marketing landing page is future work.
// TODO: build a proper public marketing landing page for Stems.
definePageMeta({ layout: false })

await navigateTo('/discover', { redirectCode: 302 })
</script>

<template>
  <div />
</template>
