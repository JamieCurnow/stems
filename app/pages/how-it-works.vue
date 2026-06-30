<script setup lang="ts">
// Public marketing page on the slim `default` chrome (Stems wordmark + nav +
// footer come from the layout, not this page). Job: let a time-poor grower
// understand what Stems is in under a minute and decide it is worth signing up.
// Restyled to sit alongside the `/` landing (index.vue) — same floral-wash hero,
// phone mock, steps, one-clean-link band, invoice card and CTA language — and
// adds a new Orders & invoices section.
//
// Responsive: the mobile single column is the base; the desktop layout kicks in
// at `lg` (>=1024px). On desktop the hero becomes two columns (headline + phone
// mock), the steps become a 4-up grid, the phone-preview band is swapped for the
// stems.market/@you "one clean link" band (the phone already shows in the hero),
// and orders becomes two columns. Static page: no auth, no data fetching.
// Copy follows marketing/00-foundations/brand-voice.md (warm, calm, honest,
// no em-dashes, UK spelling). Speaks to the grower first.
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'How it works',
  description:
    'Stems in four steps: claim your page, list what is in season, share one link, and get contacted directly. Send tidy invoices straight from your flower list. No commission, no middleman. Set up in an evening.'
})

const steps = [
  {
    icon: 'i-lucide-at-sign',
    title: 'Claim your page',
    body: 'Pick a handle and add your farm name, your area, and a line about who you are. This is your shopfront, and it is yours.'
  },
  {
    icon: 'i-lucide-flower-2',
    title: 'List what is in season',
    body: 'Add each flower with its variety, colour, price per stem, and whether it is ready now or coming soon. Drop in a photo and you are done.'
  },
  {
    icon: 'i-lucide-share-2',
    title: 'Share one link',
    body: 'Put your page at the top of your Instagram, in your bio, or on a market sign. When someone asks what you have got, send the link instead of typing it all out again.'
  },
  {
    icon: 'i-lucide-message-circle',
    title: 'Get contacted directly',
    body: 'Buyers reach you however you like to be reached: WhatsApp, email, Instagram. The sale and the relationship stay yours. We never sit in the middle.'
  }
]

// Green-check reassurances for the desktop Orders & invoices column.
const invoicePoints = [
  'Built from the flowers you already list',
  'Saved buyers, one tap to bill again',
  'Mark paid and keep a tidy record'
]

const reassurances = [
  { label: 'No commission', body: 'We take no cut of any sale. Ever.' },
  { label: 'No middleman', body: 'Your buyers are yours, not ours.' },
  { label: 'Set up in an evening', body: 'And most of that is choosing the photos.' }
]
</script>

<template>
  <div class="bg-default">
    <!-- 1. HERO — full-bleed floral wash. Mobile: stacked centred headline.
         Desktop (lg+): two columns, headline + CTAs left, phone mock right. -->
    <section class="relative w-full overflow-hidden">
      <div
        class="absolute inset-0 scale-110 bg-[url('/hero-flowers.svg')] bg-cover bg-center blur-xl"
        aria-hidden="true"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-white/45 via-white/45 to-white" aria-hidden="true" />

      <div class="relative mx-auto max-w-[1120px] px-6 lg:px-14">
        <!-- Mobile hero -->
        <div class="pb-10 pt-14 text-center sm:pb-12 sm:pt-16 lg:hidden">
          <p class="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">How it works</p>
          <h1 class="mt-3 font-display text-[42px] font-medium leading-[1.02] tracking-tight text-default">
            Your flowers, on one link
          </h1>
          <p class="mx-auto mt-3.5 max-w-[280px] text-balance text-[15px] leading-relaxed text-muted">
            Stems is one good-looking page for what you have in season. You update it in minutes and share it
            with one link. Here is the whole thing.
          </p>
        </div>

        <!-- Desktop hero (two columns) -->
        <div class="hidden items-center gap-20 pb-[88px] pt-[60px] lg:flex">
          <div class="max-w-[540px] flex-1">
            <p class="text-[12px] font-semibold uppercase tracking-[0.32em] text-primary">How it works</p>
            <h1
              class="mt-5 font-display text-[58px] font-medium leading-[1.02] tracking-[-0.015em] text-default"
            >
              Your flowers, on one link.
            </h1>
            <p class="mt-[22px] max-w-[440px] text-[17px] leading-relaxed text-muted">
              Stems is one good-looking page for what you have in season. You update it in minutes and share it
              with one link. No website to build, no commission to pay. Here is the whole thing.
            </p>
            <div class="mt-[34px] flex items-center gap-[22px]">
              <UButton to="/login" color="primary" size="lg" class="rounded-full px-[34px] py-[17px] text-base font-medium">
                List your flowers
              </UButton>
              <UButton
                to="/discover"
                variant="link"
                color="neutral"
                trailing-icon="i-lucide-arrow-right"
                class="text-[15px] text-muted hover:text-default"
              >
                See a live page
              </UButton>
            </div>
          </div>
          <div class="shrink-0">
            <LandingPhoneMock />
          </div>
        </div>
      </div>
    </section>

    <!-- 2. FOUR STEPS — borderless rows on hairline dividers (mobile) becoming a
         4-up grid (lg) with a centred section header. Big peach numeral + peach
         icon circle so the page reads at a glance. -->
    <section class="bg-default px-6 py-14 sm:py-16 lg:px-14 lg:py-[90px]">
      <div class="mx-auto max-w-[1120px]">
        <div class="hidden text-center lg:block">
          <p class="text-[12px] font-semibold uppercase tracking-[0.3em] text-primary">Four steps</p>
          <h2 class="mt-3.5 font-display text-[40px] font-medium tracking-tight text-default">
            From the cutting patch to one link
          </h2>
        </div>

        <ol class="divide-y divide-default lg:mt-[54px] lg:grid lg:grid-cols-4 lg:gap-[34px] lg:divide-y-0">
          <li
            v-for="(step, i) in steps"
            :key="step.title"
            class="flex gap-4 py-5 first:pt-0 last:pb-0 lg:flex-col lg:gap-0 lg:py-0 lg:first:pt-0 lg:last:pb-0"
          >
            <!-- Icon + numeral. Mobile: stacked under the circle. Desktop: inline. -->
            <div class="flex shrink-0 flex-col items-center gap-2 lg:flex-row lg:gap-3">
              <div
                class="flex size-11 items-center justify-center rounded-full bg-peach-100 lg:size-[54px]"
              >
                <UIcon :name="step.icon" class="size-[19px] text-peach-700 lg:size-[23px]" />
              </div>
              <span class="font-display text-[13px] font-medium leading-none text-[#C9A99E] lg:text-[17px]">
                {{ String(i + 1).padStart(2, '0') }}
              </span>
            </div>
            <div class="lg:mt-[18px]">
              <h3 class="font-display text-xl font-medium leading-tight text-default lg:text-[22px]">
                {{ step.title }}
              </h3>
              <p class="mt-1.5 text-sm leading-relaxed text-muted lg:mt-2.5 lg:text-[15px]">
                {{ step.body }}
              </p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- 3. THE WHOLE THING — full-bleed peach band. Mobile shows the phone mock
         (it has no hero phone); desktop swaps it for the stems.market/@you "one
         clean link" pill (the phone already lives in the desktop hero). -->
    <section class="bg-primary/5 px-6 py-12 lg:px-14 lg:py-[84px]">
      <div class="mx-auto max-w-[1120px] text-center">
        <!-- Mobile: phone preview -->
        <div class="lg:hidden">
          <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
            Here is the whole thing
          </p>
          <h2 class="mx-auto mt-3 max-w-[290px] font-display text-[27px] font-medium leading-tight tracking-tight text-default">
            One page. Everything in season.
          </h2>
          <div class="mt-8 flex justify-center">
            <LandingPhoneMock />
          </div>
          <p class="mx-auto mt-4 max-w-[300px] text-[13px] leading-relaxed text-muted">
            A real grower's page. Twenty-one stems in season, updated an hour ago, all on one link.
          </p>
        </div>

        <!-- Desktop: one clean link pill -->
        <div class="hidden lg:block">
          <p class="text-[12px] font-semibold uppercase tracking-[0.3em] text-primary">One clean link</p>
          <h2 class="mx-auto mt-3.5 max-w-[620px] font-display text-[40px] font-medium tracking-tight text-default">
            A page that works the moment you share it
          </h2>
          <p
            class="mx-auto mt-[30px] inline-block rounded-full bg-white px-8 py-4 font-display text-2xl text-default shadow-sm ring-1 ring-primary/15"
          >
            stems.market/<span class="text-primary">@you</span>
          </p>
          <p class="mx-auto mt-[26px] max-w-[560px] text-balance text-base leading-relaxed text-muted">
            No app to download, no sign-in to look. They click, see what is in this week, and reach you the way
            they always have. You keep your customers. We never take a cut.
          </p>
        </div>
      </div>
    </section>

    <!-- 4. ORDERS & INVOICES (new) — stacked + centred (mobile) becoming two
         columns (lg): copy + green-check points left, invoice card right. -->
    <section class="border-t border-default bg-default px-6 py-12 sm:py-14 lg:px-14 lg:py-[90px]">
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
            the amounts, and send a tidy invoice. Mark it paid when the money is in. No spreadsheets, no
            chasing.
          </p>

          <!-- Green-check points: desktop only (the card carries the story on mobile). -->
          <ul class="mt-[26px] hidden flex-col gap-3.5 lg:flex">
            <li
              v-for="point in invoicePoints"
              :key="point"
              class="flex items-center gap-2.5 text-[15px] leading-snug text-default"
            >
              <UIcon name="i-lucide-check" class="size-[18px] shrink-0 text-success" />
              {{ point }}
            </li>
          </ul>
        </div>

        <LandingInvoiceCard class="mx-auto mt-7 lg:mx-0 lg:mt-0 lg:shrink-0" />
      </div>
    </section>

    <!-- 5. FACTS — three label/value rows on hairline dividers (mobile) becoming
         a 3-up grid on a border-top (lg). The sceptical-grower reassurances. -->
    <section class="bg-default px-6 py-2 pb-12 lg:px-14 lg:py-[60px]">
      <div
        class="mx-auto max-w-[1120px] divide-y divide-default border-t border-default lg:grid lg:grid-cols-3 lg:gap-12 lg:divide-y-0 lg:border-t"
      >
        <div
          v-for="r in reassurances"
          :key="r.label"
          class="flex gap-3.5 py-[18px] lg:block lg:py-0 lg:pt-[60px]"
        >
          <p
            class="w-[120px] shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary lg:w-auto lg:pt-0 lg:tracking-[0.2em]"
          >
            {{ r.label }}
          </p>
          <p class="text-sm leading-relaxed text-default lg:mt-2.5 lg:text-base">{{ r.body }}</p>
        </div>
      </div>
    </section>

    <!-- 6a. CLOSING CTA (mobile) — a peach rounded panel. -->
    <section class="bg-default px-6 pb-12 lg:hidden">
      <div class="rounded-[18px] bg-primary/5 px-7 py-9 text-center">
        <h2 class="mx-auto max-w-[280px] font-display text-[26px] font-medium tracking-tight text-default">
          Ready to set up your page?
        </h2>
        <p class="mx-auto mt-3 max-w-[290px] text-balance text-[14px] leading-relaxed text-muted">
          Claim your handle, list what you have got, and put the link in your bio. The flowers will do the
          rest.
        </p>
        <div class="mt-6 flex flex-col gap-3">
          <UButton to="/login" color="primary" size="lg" class="justify-center rounded-full font-medium">
            List your flowers
          </UButton>
          <UButton
            to="/discover"
            color="neutral"
            variant="outline"
            size="lg"
            class="justify-center rounded-full"
          >
            See growers on Stems
          </UButton>
        </div>
      </div>
    </section>

    <!-- 6b. CLOSING CTA (desktop) — full-bleed floral-wash band, bookending the
         hero. -->
    <section class="relative hidden w-full overflow-hidden lg:block">
      <div
        class="absolute inset-0 scale-110 bg-[url('/hero-flowers.svg')] bg-cover bg-bottom blur-xl"
        aria-hidden="true"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-white via-white/60 to-white/85" aria-hidden="true" />

      <div class="relative mx-auto max-w-[1120px] px-14 pb-[84px] pt-[92px] text-center">
        <h2
          class="mx-auto max-w-[560px] font-display text-[44px] font-medium tracking-[-0.015em] text-default"
        >
          Ready to set up your page?
        </h2>
        <p class="mx-auto mt-[18px] max-w-[460px] text-balance text-base leading-relaxed text-muted">
          Claim your handle, list what you have got, and put the link in your bio. It takes an evening, and the
          flowers do the rest.
        </p>
        <div class="mt-8 flex items-center justify-center gap-[18px]">
          <UButton to="/login" color="primary" size="lg" class="rounded-full px-[38px] py-[17px] text-base font-medium">
            List your flowers
          </UButton>
          <UButton to="/discover" color="neutral" variant="outline" size="lg" class="rounded-full px-[30px] py-[16px] text-base">
            See growers on Stems
          </UButton>
        </div>
      </div>
    </section>
  </div>
</template>
