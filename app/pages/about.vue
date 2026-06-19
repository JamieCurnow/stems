<script setup lang="ts">
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'About · Stems',
  description: 'About Stems: local-grown flowers, straight from the grower.'
})
</script>

<template>
  <section
    class="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-20 text-center"
  >
    <UIcon name="i-lucide-flower-2" class="size-8 text-primary" />
    <p class="mt-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">About</p>
    <h1 class="mt-2 font-display text-4xl font-medium tracking-tight text-default sm:text-5xl">
      Coming soon
    </h1>
    <p class="mx-auto mt-4 max-w-sm text-balance text-muted">
      We're writing the story behind Stems: local-grown flowers, straight from the grower. Check back shortly.
    </p>
    <UButton to="/discover" color="primary" variant="soft" class="mt-7 rounded-full px-5">
      Discover growers
    </UButton>
  </section>
</template>
