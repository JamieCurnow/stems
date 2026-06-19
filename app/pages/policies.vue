<script setup lang="ts">
// Small hub the discover-header "Policies" link points at; keeps the legal
// pages discoverable from one place as more get added (terms, etc.).
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Policies · Stems',
  description: 'The policies that govern your use of Stems: privacy and cookies.'
})

const policies = [
  {
    to: '/privacy',
    title: 'Privacy Policy',
    blurb: 'What we collect, why, who we share it with, and your rights under UK GDPR.'
  },
  {
    to: '/cookies',
    title: 'Cookie Policy',
    blurb: 'Every cookie we set, what it does, and how to change your choice.'
  }
]
</script>

<template>
  <article class="mx-auto max-w-3xl px-4 py-14 text-default sm:px-6 sm:py-16">
    <header class="mb-10 border-b border-default pb-6">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">Policies</p>
      <h1 class="mt-2 font-display text-4xl font-medium tracking-tight text-default sm:text-5xl">
        The fine print
      </h1>
      <p class="mt-3 max-w-prose text-muted">Here's how we look after your data.</p>
    </header>

    <ul class="space-y-3">
      <li v-for="p in policies" :key="p.to">
        <NuxtLink
          :to="p.to"
          class="group flex items-center justify-between gap-4 rounded-xl border border-default bg-elevated px-5 py-4 shadow-sm transition-colors hover:border-primary/50"
        >
          <div>
            <p class="font-display text-xl font-medium text-default">{{ p.title }}</p>
            <p class="mt-1 text-sm text-muted">{{ p.blurb }}</p>
          </div>
          <UIcon
            name="i-lucide-arrow-right"
            class="size-5 shrink-0 text-dimmed transition-colors group-hover:text-primary"
          />
        </NuxtLink>
      </li>
    </ul>

    <p class="mt-8 text-sm text-muted">
      Got a question we don't answer here? Email
      <a class="text-primary underline underline-offset-2 hover:opacity-80" href="mailto:hello@stems.market">
        hello@stems.market </a
      >.
    </p>
  </article>
</template>
