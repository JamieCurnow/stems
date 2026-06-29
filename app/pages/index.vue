<script setup lang="ts">
// Public growers-first marketing landing at `/`. No layout chrome (layout:
// false) so the hero IS the header, exactly like /discover (which sits on the
// chrome-less `app` layout): wordmark + eyebrow + CTA + the utility nav below.
// Then warm marketing sections. The hero is the grower (positioning.md); a quiet
// door points buyers at /discover, which stays the PWA start_url + discovery
// feed. Canonical + Organization/WebSite schema + /og.png inherited from
// app.vue. No em-dashes, UK spelling.
import { authClient } from '~/utils/auth-client'

definePageMeta({ layout: false })

// Same links + styling as the /discover hero nav.
const navLinks = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/about', label: 'About' },
  { to: '/blog', label: 'Blog' },
  { to: '/policies', label: 'Policies' }
]

useSeoMeta({
  // The global title template (brief 02) appends ' · Stems'.
  title: 'Local-grown flowers, straight from the grower',
  description:
    'Stems is the shopfront for small flower growers. List your flowers, share one clean link, and let buyers find you. No commission, no middleman. Free to start.'
})

// CTA adapts to auth state. The session resolves client-side, so SSR and first
// paint look "logged out"; gating on !isPending (true until known) stops the
// signed-out CTA flashing in for signed-in users on refresh, like discover.vue.
const session = authClient.useSession()
const isAuthed = computed(() => !!session.value.data?.user)
const showSignedOutCta = computed(() => !session.value.isPending && !isAuthed.value)

const steps = [
  {
    icon: 'i-lucide-at-sign',
    title: 'Claim your handle',
    body: 'Your farm name, your area, and a line about who you are. Your own corner of the internet, set up in the time it takes to have a coffee.'
  },
  {
    icon: 'i-lucide-flower-2',
    title: "List what's in season",
    body: 'Each variety, its colour, the price per stem, and whether it is ready now or coming soon. Add a photo and it looks every bit as good as the flowers do.'
  },
  {
    icon: 'i-lucide-link-2',
    title: 'Share one link',
    body: 'Put your page at the top of your Instagram and in your bio. When someone asks what you have got, you send the link instead of typing the list out again.'
  }
]
</script>

<template>
  <div class="min-h-[100dvh] bg-default">
    <!-- The hero IS the header (no top bar), exactly like the /discover hero:
         eyebrow + wordmark + CTA, with the utility nav below. Full-bleed floral
         wash; the content stays in the centred column. -->
    <header class="relative w-full overflow-hidden">
      <div
        class="absolute inset-0 scale-110 bg-[url('/hero-flowers.svg')] bg-cover bg-center blur-xl"
        aria-hidden="true"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-white/45 via-white/40 to-white" aria-hidden="true" />

      <div class="relative mx-auto max-w-screen-sm px-4 pb-10 pt-14 text-center sm:pb-12 sm:pt-16">
        <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
          Local · Seasonal · Grown
        </p>
        <h1
          class="mt-2 font-display text-6xl font-medium leading-none tracking-tight text-default sm:text-7xl"
        >
          Stems
        </h1>
        <p class="mx-auto mt-3 max-w-xs text-balance text-muted">
          Local-grown flowers, straight from the grower
        </p>

        <div v-if="showSignedOutCta" class="mt-6 flex flex-col items-center gap-3">
          <UButton to="/login" color="primary" size="lg" class="rounded-full px-7 font-medium">
            List your flowers
          </UButton>
          <UButton
            to="/login"
            variant="link"
            color="neutral"
            trailing-icon="i-lucide-arrow-right"
            class="text-muted hover:text-default"
          >
            or sign in
          </UButton>
        </div>
        <div v-else class="mt-6 flex justify-center">
          <UButton to="/discover" color="primary" size="lg" class="rounded-full px-7 font-medium">
            Open Stems
          </UButton>
        </div>

        <!-- Utility nav below the CTA, same styling as the /discover hero. -->
        <nav
          class="mt-6 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted"
          aria-label="More"
        >
          <template v-for="(link, i) in navLinks" :key="link.to">
            <span v-if="i > 0" class="text-dimmed" aria-hidden="true">·</span>
            <NuxtLink :to="link.to" class="transition-colors hover:text-primary">{{ link.label }}</NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <!-- Warm manifesto: open on the grower's real situation (the 6am DM pile),
         not a metaphor. The product is the calm answer. brand-voice.md holds
         this "your flowers already sell themselves" line up as the bar. -->
    <section class="bg-primary/5">
      <div class="mx-auto max-w-screen-sm px-6 py-16 sm:py-20">
        <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
          The shopfront, without the website
        </p>
        <p
          class="mt-4 max-w-md font-display text-3xl font-medium leading-snug tracking-tight text-default sm:text-4xl"
        >
          Your flowers already sell themselves.
        </p>
        <p class="mt-5 max-w-md leading-relaxed text-muted">
          They just need somewhere to be seen that isn't buried in a dozen different chats. Stems is one
          good-looking page for what you have in season, with photos, prices, and what is ready now. No
          website to build, no commission to pay.
        </p>
      </div>
    </section>

    <div class="mx-auto max-w-screen-sm px-6">
      <!-- How it works: warm feature blocks led by a floral icon, not big
           numbers, on hairline dividers. -->
      <section class="py-16 sm:py-20">
        <div class="text-center">
          <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">How it works</p>
          <h2 class="mt-2 font-display text-3xl font-medium tracking-tight text-default sm:text-4xl">
            From the cutting patch to one shareable link
          </h2>
        </div>

        <div class="mt-10 divide-y divide-default">
          <div v-for="step in steps" :key="step.title" class="flex gap-5 py-7 first:pt-0 last:pb-0">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <UIcon :name="step.icon" class="size-6 text-primary" />
            </div>
            <div>
              <h3 class="font-display text-xl font-medium text-default sm:text-2xl">{{ step.title }}</h3>
              <p class="mt-1.5 leading-relaxed text-muted">{{ step.body }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- The shareable link wedge, on a warm full-bleed band. -->
    <section class="bg-gradient-to-b from-primary/5 to-white">
      <div class="mx-auto max-w-screen-sm px-6 py-16 text-center sm:py-20">
        <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">One clean link</p>
        <h2 class="mt-2 font-display text-3xl font-medium tracking-tight text-default sm:text-4xl">
          A page that works the moment you share it
        </h2>
        <p
          class="mx-auto mt-6 inline-block rounded-full bg-white px-6 py-2.5 font-display text-xl text-default shadow-sm ring-1 ring-primary/15"
        >
          stems.market/<span class="text-primary">@you</span>
        </p>
        <p class="mx-auto mt-6 max-w-md text-balance leading-relaxed text-muted">
          No app for buyers to download, no sign-in to look. They click your link, see what is in this week,
          and reach you the way they always have. You keep your customers. We never take a cut.
        </p>
      </div>
    </section>

    <div class="mx-auto max-w-screen-sm px-6">
      <!-- Buyer's quiet door, deliberately subordinate to the grower CTA. -->
      <section class="border-t border-default py-12 text-center sm:py-14">
        <p class="mx-auto max-w-sm text-balance text-muted">
          Just here to buy? Search local growers near you, by name or area, no account needed.
        </p>
        <UButton to="/discover" color="neutral" variant="soft" class="mt-4 rounded-full px-6">
          Find a grower near you
        </UButton>
      </section>
    </div>

    <!-- Closing CTA over the floral wash, a lush bookend to the hero. -->
    <section class="relative w-full overflow-hidden">
      <div
        class="absolute inset-0 scale-110 bg-[url('/hero-flowers.svg')] bg-cover bg-center blur-xl"
        aria-hidden="true"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-white via-white/70 to-white/85" aria-hidden="true" />

      <div class="relative mx-auto max-w-screen-sm px-6 py-20 text-center sm:py-24">
        <h2 class="font-display text-3xl font-medium tracking-tight text-default sm:text-4xl">
          Give your flowers a good shopfront
        </h2>
        <p class="mx-auto mt-3 max-w-sm text-balance text-muted">
          It takes an evening, and most of that is choosing photos. The flowers will do the rest.
        </p>
        <div class="mt-7 flex justify-center">
          <UButton
            :to="showSignedOutCta ? '/login' : '/discover'"
            color="primary"
            size="lg"
            class="rounded-full px-8 font-medium"
          >
            {{ showSignedOutCta ? 'List your flowers' : 'Open Stems' }}
          </UButton>
        </div>
      </div>
    </section>
  </div>
</template>
