<script setup lang="ts">
// Public marketing page on the slim `default` chrome (Stems wordmark + nav +
// footer come from the layout, not this page). Job: give a visitor a feel for
// WHY Stems exists, in a first-person founder voice (Jamie & Juliette). This is
// the why, not the how, the step-by-step lives on /how-it-works.
//
// Restyled to sit alongside /how-it-works and the landing page: same floral-wash
// hero/CTA treatment, the same section rhythm, hairline dividers and no boxed
// content cards (the only shadow is on the founder photo, which is media/chrome).
//
// Responsive: the mobile single column is the base; the desktop layout kicks in
// at `lg` (>=1024px). On desktop the hero becomes two columns (copy + founder
// photo), the story sits in a narrow centred column, and the beliefs become a
// 3-up grid. Static page: no auth, no data fetching.
//
// Copy follows marketing/00-foundations/brand-voice.md (warm, calm, honest, no
// em-dashes, UK spelling). The founder narrative below is placeholder-real: the
// voice and structure are the spec, but the biographical particulars (Cornwall
// half-acre, etc.) are invented and should be confirmed with Jamie & Juliette
// before shipping.
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'About',
  description:
    'Why we made Stems. We are Jamie and Juliette, growers in Mithian. Stems is a good shopfront for small British flower growers, helping more British grown flowers get sold close to where they were cut, with no commission and no middleman.'
})

// The two short first-person chapters of the founder story.
const story = [
  {
    heading: 'It started with a spreadsheet',
    paragraphs: [
      'I grow flowers in our garden and on our allotment in Mithian, and a couple of summers ago I started selling them on the side. Every week I sat down to write up what was ready, and every week it was the same battle: fiddling with columns to make a spreadsheet look halfway presentable, lining up prices, trying to make a list of stems feel like something you would actually want to buy from.',
      'Then came the real chore. The dahlias would come in, the sweet peas would go over, and the list I had spent an evening on was wrong by the weekend. So I would redo it, export it, and send it round again. The flowers sold themselves. They just needed somewhere nicer to live than a spreadsheet I had to rebuild and resend every single week.'
    ]
  },
  {
    heading: 'So we made the thing I wished I had',
    paragraphs: [
      'Jamie builds software, and he got tired of watching me wrestle the same spreadsheet back into shape every week. One weekend he made me a single page: everything in season, a price beside each stem, one link to share, and it looked the way I had been trying to make a spreadsheet look all along. I put it at the top of my Instagram and never made another spreadsheet.',
      'Other growers we knew wanted one too. So we built it properly, for all of us. That is Stems, a good shopfront for the people who grow the flowers, and nothing more complicated than that.'
    ]
  }
]

// The three belief statements under "What we believe".
const beliefs = [
  {
    label: 'Grown nearby',
    body: 'The best flowers were in a field this morning, not on a plane. They come with a name, a place, and a person, and that is the whole point.'
  },
  {
    label: 'Your buyers stay yours',
    body: 'We never sit between you and the sale, and we never take a cut of it. People reach you the way they always have.'
  },
  {
    label: 'No lecturing',
    body: 'There is a real movement of British growers doing this properly. Stems is a tool for it, not a sermon about it.'
  }
]
</script>

<template>
  <div class="bg-default">
    <!-- 1. HERO — full-bleed floral wash. Mobile: stacked centred copy with the
         founder photo below. Desktop (lg+): two columns, copy left, photo right. -->
    <section class="relative w-full overflow-hidden">
      <div
        class="absolute inset-0 scale-[1.18] bg-[url('/hero-flowers.svg')] bg-cover bg-center blur-2xl lg:scale-110"
        aria-hidden="true"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-white/45 via-white/50 to-white" aria-hidden="true" />

      <div class="relative mx-auto max-w-[1120px] px-7 lg:px-14">
        <!-- Mobile hero copy -->
        <div class="pb-8 pt-12 text-center sm:pt-14 lg:hidden">
          <p class="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">About</p>
          <h1 class="mt-3 font-display text-[40px] font-medium leading-[1.04] tracking-tight text-default">
            Why we made Stems
          </h1>
          <p class="mx-auto mt-3.5 max-w-[300px] text-balance text-[15px] leading-relaxed text-muted">
            We are Jamie and Juliette. Stems started at our kitchen table, with a spreadsheet that was never
            quite right.
          </p>
        </div>

        <!-- Desktop hero (two columns) -->
        <div class="hidden items-center gap-[72px] pb-[82px] pt-[50px] lg:flex">
          <div class="max-w-[520px] flex-1">
            <p class="text-[12px] font-semibold uppercase tracking-[0.32em] text-primary">About</p>
            <h1
              class="mt-5 font-display text-[58px] font-medium leading-[1.02] tracking-[-0.015em] text-default"
            >
              Why we made Stems
            </h1>
            <p class="mt-[22px] max-w-[440px] text-[18px] leading-[1.6] text-muted">
              We are Jamie and Juliette. Stems started at our kitchen table, with a weekly spreadsheet that
              never looked right and was out of date by the weekend. This is the why, not the how.
            </p>
          </div>
          <div class="shrink-0">
            <img
              src="/about.jpg"
              alt="Jamie and Juliette in their cutting garden"
              class="h-[480px] w-[430px] rounded-[20px] object-cover shadow-[0_26px_60px_-28px_rgba(33,30,26,0.45)]"
            />
            <p class="mt-3 text-center text-[13px] leading-snug text-dimmed">
              Jamie &amp; Juliette · our garden and allotment in Mithian, where it began
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Founder photo (mobile) — full width on white, below the hero copy. -->
    <section class="bg-default px-7 pb-9 lg:hidden">
      <img
        src="/about.jpg"
        alt="Jamie and Juliette in their cutting garden"
        class="h-[300px] w-full rounded-2xl object-cover"
      />
      <p class="mt-3 text-center text-[12px] leading-snug text-dimmed">
        Jamie &amp; Juliette · our garden and allotment in Mithian, where it began
      </p>
    </section>

    <!-- 2. STORY — two first-person chapters. No cards, no dividers, just
         typographic rhythm. Mobile full width; desktop a narrow centred column. -->
    <section class="bg-default px-7 pb-10 lg:px-14 lg:pb-[76px] lg:pt-[84px]">
      <div class="mx-auto max-w-[720px]">
        <div v-for="(chapter, i) in story" :key="chapter.heading" :class="i > 0 ? 'mt-[34px] lg:mt-12' : ''">
          <h2
            class="font-display text-2xl font-medium leading-[1.16] tracking-tight text-default lg:text-[36px] lg:leading-[1.12]"
          >
            {{ chapter.heading }}
          </h2>
          <p
            v-for="(para, p) in chapter.paragraphs"
            :key="p"
            class="mt-3.5 text-[15px] leading-[1.62] text-[#4A453E] lg:mt-5 lg:text-[18px] lg:leading-[1.7]"
          >
            {{ para }}
          </p>
        </div>
      </div>
    </section>

    <!-- 3. CALLOUT — peach band, the British-grown thesis. -->
    <section class="bg-primary/5 px-7 py-10 text-center lg:py-20">
      <p class="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary lg:text-[12px]">
        British grown, in season
      </p>
      <p
        class="mx-auto mt-3.5 max-w-[320px] font-display text-[23px] font-medium leading-[1.3] tracking-tight text-default lg:mt-4 lg:max-w-[760px] lg:text-[38px] lg:leading-[1.28]"
      >
        Cut this morning, a few miles from your door. Not flown halfway round the world to sit in a bucket
        for a week.
      </p>
    </section>

    <!-- 4. BIGGER PICTURE — what Stems grew into, and why local + British grown
         matters. Narrow centred column like the story, on white. -->
    <section class="bg-default px-7 pb-10 lg:px-14 lg:pb-[76px] lg:pt-[20px]">
      <div class="mx-auto max-w-[720px]">
        <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary lg:text-[12px]">
          Where it is going
        </p>
        <h2
          class="mt-3 font-display text-2xl font-medium leading-[1.16] tracking-tight text-default lg:mt-4 lg:text-[36px] lg:leading-[1.12]"
        >
          It turned out we weren&rsquo;t the only ones
        </h2>
        <p class="mt-3.5 text-[15px] leading-[1.62] text-[#4A453E] lg:mt-5 lg:text-[18px] lg:leading-[1.7]">
          What began as one page for our own flowers has become something with the potential to help a lot of
          small growers. All over the country there are people doing exactly what we were doing: a garden, an
          allotment, a polytunnel, and a weekly list nobody could keep up with. Stems gives every one of them a
          proper shopfront, so the flowers they grow can be seen and sold without a spreadsheet or a middleman
          in the way.
        </p>
        <p class="mt-3.5 text-[15px] leading-[1.62] text-[#4A453E] lg:mt-5 lg:text-[18px] lg:leading-[1.7]">
          And the more growers who can list what they have, the more British grown flowers get bought close to
          where they were cut. That is the part we are quietly proud of. Every bunch sold here is a bunch that
          did not need a plane, a cold store or a long lorry ride. Buying local, in season, from someone down
          the road is better for the grower, and it is a good deal kinder to the planet too.
        </p>
      </div>
    </section>

    <!-- 5. WHAT WE BELIEVE — three belief statements. Mobile: rows on hairline
         dividers. Desktop: a 3-up grid with a centred section header. -->
    <section class="bg-default px-7 py-10 lg:px-14 lg:py-[84px]">
      <div class="mx-auto max-w-[1120px]">
        <div class="hidden text-center lg:block">
          <p class="text-[12px] font-semibold uppercase tracking-[0.3em] text-primary">What we believe</p>
          <h2
            class="mx-auto mt-3.5 max-w-[560px] font-display text-[38px] font-medium leading-[1.1] tracking-tight text-default"
          >
            A few things we&rsquo;re sure about
          </h2>
        </div>

        <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary lg:hidden">
          What we believe
        </p>

        <div
          class="mt-1.5 lg:mt-[54px] lg:grid lg:grid-cols-3 lg:gap-12"
        >
          <div
            v-for="belief in beliefs"
            :key="belief.label"
            class="flex gap-3.5 border-t border-default py-[18px] lg:block lg:border-0 lg:py-0"
          >
            <p
              class="w-[118px] shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary lg:w-auto lg:pt-0 lg:tracking-[0.2em]"
            >
              {{ belief.label }}
            </p>
            <p class="text-[14px] leading-[1.55] text-[#4A453E] lg:mt-3 lg:text-[16px] lg:leading-[1.6]">
              {{ belief.body }}
            </p>
          </div>
        </div>

        <p class="mt-[26px] text-right font-display text-[15px] italic leading-[1.6] text-muted lg:mt-12 lg:text-center lg:text-[19px]">
          Jamie &amp; Juliette
        </p>
      </div>
    </section>

    <!-- 6a. CLOSING CTA (mobile) — a peach rounded panel. -->
    <section class="bg-default px-6 pb-10 lg:hidden">
      <div class="rounded-[18px] bg-primary/5 px-7 py-9 text-center">
        <h2 class="mx-auto max-w-[280px] font-display text-[26px] font-medium leading-[1.12] tracking-tight text-default">
          Got flowers to sell?
        </h2>
        <p class="mx-auto mt-3 max-w-[290px] text-balance text-[14px] leading-relaxed text-muted">
          It takes an evening, and most of that is choosing photos. Claim your handle and put the link in your
          bio.
        </p>
        <div class="mt-6 flex flex-col gap-3">
          <UButton to="/login" color="primary" size="lg" class="justify-center rounded-full font-medium">
            List your flowers
          </UButton>
          <UButton to="/discover" color="neutral" variant="outline" size="lg" class="justify-center rounded-full">
            Find a grower near you
          </UButton>
        </div>
        <p class="mx-auto mt-5 max-w-[290px] text-[12px] leading-relaxed text-dimmed">
          Or just say hello,
          <a class="text-primary hover:opacity-80" href="mailto:hello@stems.market">hello@stems.market</a>. A
          real person reads it, usually one of us.
        </p>
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
        <h2 class="mx-auto max-w-[560px] font-display text-[44px] font-medium leading-[1.08] tracking-[-0.015em] text-default">
          Got flowers to sell?
        </h2>
        <p class="mx-auto mt-[18px] max-w-[480px] text-balance text-base leading-relaxed text-muted">
          It takes an evening, and most of that is choosing photos. Claim your handle, list what you have got,
          and put the link in your bio.
        </p>
        <div class="mt-8 flex items-center justify-center gap-[18px]">
          <UButton to="/login" color="primary" size="lg" class="rounded-full px-[38px] py-[17px] text-base font-medium">
            List your flowers
          </UButton>
          <UButton to="/discover" color="neutral" variant="outline" size="lg" class="rounded-full px-[30px] py-[16px] text-base">
            Find a grower near you
          </UButton>
        </div>
        <p class="mx-auto mt-[26px] max-w-[440px] text-[13px] leading-relaxed text-dimmed">
          Or just say hello,
          <a class="text-primary hover:opacity-80" href="mailto:hello@stems.market">hello@stems.market</a>. A
          real person reads it, usually one of us.
        </p>
      </div>
    </section>
  </div>
</template>
