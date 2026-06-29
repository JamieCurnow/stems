<script setup lang="ts">
// Public marketing page. Uses the slim `default` chrome (Stems wordmark +
// sign-in), not the signed-in app shell. Built to be skimmed in under a minute
// by a time-poor grower deciding whether Stems is worth it: a one-line promise,
// four numbered steps, a short reassurance block, and a single CTA.
// Copy follows marketing/00-foundations/brand-voice.md (warm, calm, honest,
// no em-dashes, UK spelling). Speaks to the grower first.
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'How it works',
  description:
    'Stems in four steps: claim your page, list what is in season, share one link, and get contacted directly. No commission, no middleman. Set up in an evening.'
})

const steps = [
  {
    title: 'Claim your page',
    body: 'Pick a handle and add your farm name, your area, and a line about who you are. This is your shopfront, and it is yours.'
  },
  {
    title: 'List what is in season',
    body: 'Add each flower with its variety, colour, price per stem, and whether it is ready now or coming soon. Drop in a photo and you are done.'
  },
  {
    title: 'Share one link',
    body: 'Put your page at the top of your Instagram, in your bio, or on a market sign. When someone asks what you have got, send the link instead of typing it all out again.'
  },
  {
    title: 'Get contacted directly',
    body: 'Buyers reach you however you like to be reached: WhatsApp, email, Instagram. The sale and the relationship stay yours. We never sit in the middle.'
  }
]

const reassurances = [
  { label: 'No commission', body: 'We take no cut of any sale. Ever.' },
  { label: 'No middleman', body: 'Your buyers are yours, not ours.' },
  { label: 'Set up in an evening', body: 'Most of that is choosing photos.' }
]
</script>

<template>
  <article class="mx-auto max-w-3xl px-4 py-14 text-default sm:px-6 sm:py-16">
    <header class="mb-12 border-b border-default pb-6">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">How it works</p>
      <h1 class="mt-2 font-display text-4xl font-medium tracking-tight text-default sm:text-5xl">
        Your flowers, on one link
      </h1>
      <p class="mt-4 max-w-prose text-lg leading-relaxed text-muted">
        Stems is a single, good-looking page for what you have in season. You update it in minutes and share
        it with one link. Here is the whole thing.
      </p>
    </header>

    <!-- The four steps. Big peach numeral, borderless rows on hairline
         dividers, so the page reads at a glance. -->
    <ol class="divide-y divide-default">
      <li v-for="(step, i) in steps" :key="step.title" class="flex gap-5 py-6 sm:gap-7">
        <span
          class="font-display text-3xl font-medium leading-none text-primary sm:text-4xl"
          aria-hidden="true"
        >
          {{ i + 1 }}
        </span>
        <div>
          <h2 class="font-display text-2xl font-medium text-default">{{ step.title }}</h2>
          <p class="mt-1.5 max-w-prose leading-relaxed text-muted">{{ step.body }}</p>
        </div>
      </li>
    </ol>

    <!-- Quick reassurance: the things a sceptical grower wants to hear. -->
    <section class="mt-12 grid gap-6 border-t border-default pt-10 sm:grid-cols-3">
      <div v-for="r in reassurances" :key="r.label">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{{ r.label }}</p>
        <p class="mt-1.5 text-sm leading-relaxed text-muted">{{ r.body }}</p>
      </div>
    </section>

    <!-- Single CTA. -->
    <section class="mt-14 rounded-2xl bg-primary/5 px-6 py-8 sm:px-8">
      <h2 class="mb-3 font-display text-2xl font-medium text-default">Ready to set up your page?</h2>
      <p class="max-w-prose text-muted">
        Claim your handle, list what you have got, and put the link in your bio. The flowers will do the rest.
      </p>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        <UButton to="/login" color="primary" size="lg" class="justify-center rounded-full px-7 font-medium">
          List your flowers
        </UButton>
        <UButton
          to="/discover"
          color="neutral"
          variant="soft"
          size="lg"
          class="justify-center rounded-full px-7"
        >
          See growers on Stems
        </UButton>
      </div>
    </section>

    <p class="mt-8 text-sm text-muted">
      Want the longer story? Read
      <NuxtLink class="text-primary underline underline-offset-2 hover:opacity-80" to="/about">
        about Stems </NuxtLink
      >, or email
      <a class="text-primary underline underline-offset-2 hover:opacity-80" href="mailto:hello@stems.market">
        hello@stems.market </a
      >. A real person reads it.
    </p>
  </article>
</template>
