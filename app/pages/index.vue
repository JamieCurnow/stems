<script setup lang="ts">
// Public growers-first marketing landing at `/`. No layout chrome (layout:
// false) so the hero is the page header. Direction A redesign, image-led and
// built around one centrepiece (a phone mockup of a real grower's page).
//
// Responsive: the mobile single column is the base; the desktop layout kicks in
// at `lg` (>=1024px) per the desktop handoff. On desktop the oversized centred
// "Stems" wordmark moves into a top bar, the hero becomes two columns (value
// headline + phone), how-it-works becomes a 3-up grid, orders becomes two
// columns, and a real footer bar appears. The phone mockup (<LandingPhoneMock>)
// renders in the mobile centrepiece and the desktop hero; both are static
// illustrations, never wired to live data. No em-dashes, UK spelling.
import { authClient } from '~/utils/auth-client'

definePageMeta({ layout: false })

const navLinks = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/about', label: 'About' },
  { to: '/blog', label: 'Blog' }
]

// Policies lives only in the footer, not the top bar / hero nav.
const footerLinks = [...navLinks, { to: '/policies', label: 'Policies' }]

useSeoMeta({
  // The global title template (brief 02) appends ' · Stems'.
  title: 'Local-grown flowers, straight from the grower',
  description:
    'Stems is the shopfront for small flower growers. List your flowers, share one clean link, and let buyers find you. No commission, no middleman, free to use.'
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
    body: 'Your farm name, your area, a line about who you are. Set up in the time it takes to have a coffee.'
  },
  {
    icon: 'i-lucide-flower-2',
    title: "List what's in season",
    body: 'Each variety, its colour, the price per stem, a photo. It looks every bit as good as the flowers do.'
  },
  {
    icon: 'i-lucide-link-2',
    title: 'Share one link',
    body: 'Top of your Instagram, in your bio, on a market sign. One link instead of typing the list out again.'
  }
]
</script>

<template>
  <div class="min-h-[100dvh] bg-default">
    <!-- 1. HERO / HEADER — full-bleed floral wash. Mobile: stacked centred hero
         (the wordmark is the headline). Desktop (lg+): a top bar + two-column
         hero (value headline left, phone right). -->
    <header class="relative w-full overflow-hidden">
      <div
        class="absolute inset-0 scale-110 bg-[url('/hero-flowers.svg')] bg-cover bg-center blur-xl"
        aria-hidden="true"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-white/45 via-white/40 to-white" aria-hidden="true" />

      <div class="relative mx-auto max-w-[1120px] px-6 lg:px-14">
        <!-- Desktop top bar -->
        <nav class="hidden items-center justify-between py-7 lg:flex" aria-label="Primary">
          <NuxtLink to="/" class="select-none font-display text-[26px] font-medium tracking-tight text-default">
            Stems
          </NuxtLink>
          <div class="flex items-center gap-[30px]">
            <div class="flex items-center gap-[26px] text-[13px] font-medium text-muted">
              <NuxtLink
                v-for="link in navLinks"
                :key="link.to"
                :to="link.to"
                class="transition-colors hover:text-primary"
              >
                {{ link.label }}
              </NuxtLink>
            </div>
            <div class="h-[18px] w-px bg-[var(--ui-border)]" aria-hidden="true" />
            <template v-if="showSignedOutCta">
              <NuxtLink
                to="/login"
                class="text-[13px] font-medium text-default transition-colors hover:text-primary"
              >
                Sign in
              </NuxtLink>
              <UButton to="/login" color="primary" size="sm" class="rounded-full px-5 py-2.5 font-medium">
                List your flowers
              </UButton>
            </template>
            <UButton
              v-else
              to="/discover"
              color="primary"
              size="sm"
              class="rounded-full px-5 py-2.5 font-medium"
            >
              Open Stems
            </UButton>
          </div>
        </nav>

        <!-- Mobile hero (stacked, centred) -->
        <div class="pb-12 pt-14 text-center sm:pb-14 sm:pt-16 lg:hidden">
          <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
            Local · Seasonal · Grown
          </p>
          <!-- The visible wordmark is the brand mark; the sr-only continuation
               gives crawlers and screen readers a keyword-rich H1 without
               changing the design. No em-dashes (copywriting rule). -->
          <h1
            class="mt-2.5 select-none font-display text-6xl font-medium leading-none tracking-tight text-default sm:text-7xl"
          >
            <span aria-hidden="true">Stems</span>
            <span class="sr-only">
              Stems, the shareable shopfront for small UK flower growers. Local-grown, seasonal flowers,
              straight from the grower.
            </span>
          </h1>
          <p class="mx-auto mt-3 max-w-[228px] text-balance text-[15px] text-muted">
            Local-grown flowers, straight from the grower
          </p>

          <div v-if="showSignedOutCta" class="mt-6 flex flex-col items-center gap-3">
            <UButton to="/login" color="primary" size="lg" class="rounded-full px-8 font-medium">
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
            <UButton to="/discover" color="primary" size="lg" class="rounded-full px-8 font-medium">
              Open Stems
            </UButton>
          </div>

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

        <!-- Desktop hero (two columns) -->
        <div class="hidden items-center gap-20 pb-[92px] pt-[60px] lg:flex">
          <div class="max-w-[540px] flex-1">
            <p class="text-[12px] font-semibold uppercase tracking-[0.32em] text-primary">
              Local · Seasonal · Grown
            </p>
            <h1
              class="mt-5 font-display text-[56px] font-medium leading-[1.04] tracking-[-0.015em] text-default"
            >
              A public page for your flower stock, shared with one link.
            </h1>
            <p class="mt-[22px] max-w-[430px] text-[17px] leading-relaxed text-muted">
              List what you have grown, share one link, and keep every customer. No website to build, no
              commission to pay.
            </p>
            <div class="mt-[34px] flex items-center gap-[22px]">
              <UButton
                :to="showSignedOutCta ? '/login' : '/discover'"
                color="primary"
                size="lg"
                class="rounded-full px-[34px] py-[17px] text-base font-medium"
              >
                {{ showSignedOutCta ? 'List your flowers' : 'Open Stems' }}
              </UButton>
              <UButton
                v-if="showSignedOutCta"
                to="/login"
                variant="link"
                color="neutral"
                trailing-icon="i-lucide-arrow-right"
                class="text-[15px] text-muted hover:text-default"
              >
                or sign in
              </UButton>
            </div>
          </div>
          <div class="shrink-0">
            <LandingPhoneMock />
          </div>
        </div>
      </div>
    </header>

    <!-- 2. CENTREPIECE (mobile only) — eyebrow + headline + phone + caption. On
         desktop the phone lives in the hero and this headline becomes the hero
         h1, so the section is dropped at lg. -->
    <section class="bg-default px-6 pt-14 text-center sm:pt-16 lg:hidden">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">What it is</p>
      <h2
        class="mx-auto mt-3 max-w-[320px] font-display text-3xl font-medium leading-tight tracking-tight text-default"
      >
        A public page for your flower stock, shared with one link.
      </h2>

      <div class="mt-9 flex justify-center">
        <LandingPhoneMock />
      </div>

      <p class="mx-auto mt-4 max-w-[340px] text-[13px] leading-relaxed text-muted">
        A real grower's page. Twenty-one stems in season, updated an hour ago, all on one link.
      </p>
    </section>

    <!-- 3. HOW IT WORKS — stacked rows (mobile) becoming a 3-up grid (lg). -->
    <section class="bg-default px-6 py-16 sm:py-20 lg:px-14 lg:py-[92px]">
      <div class="mx-auto max-w-[1120px]">
        <div class="text-center">
          <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary lg:text-[12px]">
            How it works
          </p>
          <h2
            class="mx-auto mt-2.5 max-w-[300px] font-display text-[27px] font-medium tracking-tight text-default lg:mt-3.5 lg:max-w-none lg:text-[40px]"
          >
            From the cutting patch to one link
          </h2>
        </div>

        <div class="mt-8 divide-y divide-default lg:mt-[54px] lg:grid lg:grid-cols-3 lg:gap-12 lg:divide-y-0">
          <div
            v-for="step in steps"
            :key="step.title"
            class="flex gap-4 py-7 first:pt-0 last:pb-0 lg:flex-col lg:items-center lg:gap-5 lg:py-0 lg:text-center"
          >
            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 lg:size-[60px]"
            >
              <UIcon :name="step.icon" class="size-5 text-peach-700 lg:size-[26px]" />
            </div>
            <div>
              <h3 class="font-display text-xl font-medium text-default lg:text-[23px]">{{ step.title }}</h3>
              <p
                class="mt-1.5 leading-relaxed text-muted lg:mx-auto lg:mt-2.5 lg:max-w-[300px] lg:text-[15px]"
              >
                {{ step.body }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. ONE CLEAN LINK — full-bleed peach-50 band, centred, scaled up at lg. -->
    <section class="bg-primary/5 px-6 py-12 lg:px-14 lg:py-[88px]">
      <div class="mx-auto max-w-[1120px] text-center">
        <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary lg:text-[12px]">
          One clean link
        </p>
        <h2
          class="mx-auto mt-2.5 max-w-[290px] font-display text-[27px] font-medium tracking-tight text-default lg:mt-3.5 lg:max-w-[620px] lg:text-[40px]"
        >
          A page that works the moment you share it
        </h2>
        <p
          class="mx-auto mt-6 inline-block rounded-full bg-white px-6 py-3 font-display text-lg text-default shadow-sm ring-1 ring-primary/15 lg:mt-[30px] lg:px-8 lg:py-4 lg:text-2xl"
        >
          stems.market/<span class="text-primary">@you</span>
        </p>
        <p
          class="mx-auto mt-5 max-w-[300px] text-balance text-[15px] leading-relaxed text-muted lg:mt-[26px] lg:max-w-[560px] lg:text-base"
        >
          No app to download, no sign-in to look. They click, see what is in this week, and reach you the way
          they always have. We never take a cut.
        </p>
      </div>
    </section>

    <!-- 5. ORDERS & INVOICES — stacked + centred (mobile) becoming two columns
         (lg): copy left, invoice mock card right. -->
    <section class="border-t border-default bg-default px-6 py-12 sm:py-14 lg:px-14 lg:py-[92px]">
      <div class="mx-auto max-w-[1120px] lg:flex lg:items-center lg:gap-20">
        <div class="text-center lg:max-w-[480px] lg:flex-1 lg:text-left">
          <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary lg:text-[12px]">
            Orders &amp; invoices
          </p>
          <h2
            class="mx-auto mt-2.5 max-w-[300px] font-display text-[27px] font-medium tracking-tight text-default lg:mx-0 lg:mt-4 lg:max-w-none lg:text-[40px]"
          >
            Got an order? Send an invoice in seconds.
          </h2>
          <p
            class="mx-auto mt-3.5 max-w-[300px] text-balance text-[15px] leading-relaxed text-muted lg:mx-0 lg:mt-5 lg:max-w-[420px] lg:text-base"
          >
            Save your buyers as contacts, then bill them straight from your flower list. Pick the stems, set
            the amounts, send a tidy invoice. Mark it paid when the money is in.
          </p>
        </div>

        <!-- Invoice mock card (presentational illustration of the printable invoice). -->
        <LandingInvoiceCard class="mx-auto mt-7 lg:mx-0 lg:mt-0 lg:shrink-0" />
      </div>
    </section>

    <!-- 6. BUYER DOOR — stacked (mobile) becoming a centred inline row (lg). -->
    <section class="border-t border-default bg-default px-6 py-10 lg:px-14">
      <div
        class="mx-auto max-w-[1120px] text-center lg:flex lg:flex-wrap lg:items-center lg:justify-center lg:gap-[22px]"
      >
        <p
          class="mx-auto max-w-[280px] text-balance text-[13px] leading-relaxed text-muted lg:mx-0 lg:max-w-none lg:text-[15px]"
        >
          Just here to buy? Find a local grower by name or area, no account needed.
        </p>
        <UButton
          to="/discover"
          variant="outline"
          color="neutral"
          icon="i-lucide-search"
          class="mt-3.5 rounded-full px-5 lg:mt-0"
        >
          Find a grower near you
        </UButton>
      </div>
    </section>

    <!-- 7. CLOSING — full-bleed floral wash bookending the hero, scaled up at lg.
         The footer wordmark is inline on mobile; desktop gets a real footer bar. -->
    <section class="relative w-full overflow-hidden">
      <div
        class="absolute inset-0 scale-110 bg-[url('/hero-flowers.svg')] bg-cover bg-bottom blur-xl"
        aria-hidden="true"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-white via-white/60 to-white/85" aria-hidden="true" />

      <div
        class="relative mx-auto max-w-[1120px] px-6 pb-8 pt-14 text-center lg:px-14 lg:pb-[84px] lg:pt-[96px]"
      >
        <h2
          class="mx-auto max-w-[300px] font-display text-[29px] font-medium tracking-tight text-default lg:max-w-[560px] lg:text-[44px] lg:tracking-[-0.015em]"
        >
          Give your flowers a good shopfront
        </h2>
        <p
          class="mx-auto mt-3 max-w-[290px] text-balance text-[15px] leading-relaxed text-muted lg:mt-[18px] lg:max-w-[460px] lg:text-base"
        >
          It takes an evening, and most of that is choosing the photos. The flowers do the rest.
        </p>
        <div class="mt-6 flex justify-center lg:mt-8">
          <UButton
            :to="showSignedOutCta ? '/login' : '/discover'"
            color="primary"
            size="lg"
            class="rounded-full px-8 font-medium lg:px-[38px] lg:py-[17px] lg:text-base"
          >
            {{ showSignedOutCta ? 'List your flowers' : 'Open Stems' }}
          </UButton>
        </div>

        <!-- Mobile inline footer wordmark (desktop uses the footer bar below). -->
        <div class="mt-10 border-t border-default/80 pt-5 lg:hidden">
          <div class="font-display text-[23px] font-medium text-default">Stems</div>
          <p class="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.28em] text-dimmed">
            Local · Seasonal · Grown
          </p>
        </div>
      </div>
    </section>

    <!-- Desktop footer bar -->
    <footer class="hidden border-t border-default bg-default lg:block">
      <div class="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-5 px-14 py-9">
        <div>
          <div class="font-display text-[22px] font-medium text-default">Stems</div>
          <p class="mt-[7px] text-[10px] font-semibold uppercase tracking-[0.28em] text-dimmed">
            Local · Seasonal · Grown
          </p>
        </div>
        <div class="flex items-center gap-[26px] text-[13px] font-medium text-muted">
          <NuxtLink
            v-for="link in footerLinks"
            :key="link.to"
            :to="link.to"
            class="transition-colors hover:text-primary"
          >
            {{ link.label }}
          </NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
