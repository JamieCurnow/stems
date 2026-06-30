<script setup lang="ts">
// Public marketing blog index (default chrome, not the app shell). Posts come
// from @nuxt/content; drafts are hidden in production and shown in dev so the
// surface can be previewed before publishing. Stems brand: white canvas, EB
// Garamond display headings, peach accent, hairline dividers (no cards).
//
// Layout: a floral-wash page header (mirrors how-it-works.vue), then a
// lead-post + thumbnailed-list split — the most recent post is the lead
// (full-width feature image + larger title), the rest are hairline-divided
// rows. Feature images are optional (`post.image`); rows without one drop the
// thumbnail and read as clean text. Desktop rows put the thumbnail on the right
// so every row's text left-edge stays aligned. Responsive: mobile is the
// stacked base, desktop kicks in at lg (image moves to the right on list rows).
definePageMeta({ layout: 'default' })

useSeoMeta({
  // The global title template (brief 02) appends ' · Stems'.
  title: 'Blog',
  description: 'Notes from Stems: growing, seasonality, and the people behind the flowers.'
})

const { data: posts } = await useAsyncData('blog-index', () => {
  const query = queryCollection('blog').order('date', 'DESC')
  return import.meta.dev ? query.all() : query.where('draft', '=', false).all()
})

// Lead = most recent post; list = the rest (still date DESC).
const lead = computed(() => posts.value?.[0])
const rest = computed(() => posts.value?.slice(1) ?? [])

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const formatDate = (d: string) => dateFmt.format(new Date(d))
</script>

<template>
  <div class="bg-default text-default">
    <!-- PAGE HEADER — full-bleed floral wash, left-aligned (mirrors the other
         marketing pages). Copy is unchanged from the original index. -->
    <section class="relative w-full overflow-hidden">
      <div
        class="absolute inset-0 scale-110 bg-[url('/hero-flowers.svg')] bg-cover bg-center blur-xl"
        aria-hidden="true"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-white/45 via-white/55 to-white" aria-hidden="true" />

      <div class="relative mx-auto max-w-[1040px] px-7 lg:px-14">
        <div class="max-w-[680px] py-12 lg:py-[60px]">
          <p class="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary lg:text-[12px]">
            Blog
          </p>
          <h1
            class="mt-3 font-display text-[40px] font-medium leading-[1.04] tracking-[-0.01em] text-default lg:mt-4 lg:text-[56px] lg:leading-[1.02] lg:tracking-[-0.015em]"
          >
            Notes from the field
          </h1>
          <p class="mt-3.5 max-w-[560px] text-[15px] leading-relaxed text-muted lg:mt-5 lg:text-[18px]">
            Growing, seasonality, and the people behind the flowers. Practical things for growers, and a
            little on why local and in season is worth the bother.
          </p>
        </div>
      </div>
    </section>

    <!-- CONTENT -->
    <div v-if="posts && posts.length" class="mx-auto max-w-[1040px] px-7 pb-20 pt-2 lg:px-14 lg:pb-24">
      <!-- LEAD POST — full content-width block, optional large feature image. -->
      <NuxtLink
        v-if="lead"
        :to="lead.path"
        class="group -mx-6 block rounded-[14px] px-6 py-8 transition-colors hover:bg-peach-50 lg:py-10"
      >
        <img
          v-if="lead.image"
          :src="lead.image"
          :alt="lead.imageAlt"
          loading="lazy"
          class="h-[212px] w-full rounded-[14px] object-cover lg:h-[392px] lg:rounded-[16px]"
        />
        <div :class="['flex flex-wrap items-center gap-3', { 'mt-4 lg:mt-[26px]': lead.image }]">
          <time
            :datetime="lead.date"
            class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted lg:text-[12px]"
          >
            {{ formatDate(lead.date) }}
          </time>
          <span
            v-if="lead.draft"
            class="rounded-full bg-[#FCE3DD] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#C0503F] lg:text-[10px]"
          >
            Draft
          </span>
        </div>
        <h2
          class="mt-2.5 max-w-[760px] font-display text-[27px] font-medium leading-[1.14] tracking-[-0.01em] text-default lg:mt-3.5 lg:text-[40px] lg:leading-[1.1] lg:tracking-[-0.012em]"
        >
          {{ lead.title }}
        </h2>
        <p class="mt-2 max-w-[680px] text-[15px] leading-relaxed text-muted lg:mt-3.5 lg:text-[17px]">
          {{ lead.description }}
        </p>
      </NuxtLink>

      <!-- POST LIST — hairline-divided rows. Mobile: image on top. Desktop:
           image on the right (text left-edge stays aligned; image-less rows just
           drop the thumbnail and read full width). -->
      <NuxtLink
        v-for="post in rest"
        :key="post.path"
        :to="post.path"
        class="group -mx-6 flex flex-col gap-3.5 border-t border-default px-6 py-7 transition-colors hover:bg-peach-50 lg:flex-row lg:items-start lg:gap-10 lg:py-[34px]"
      >
        <img
          v-if="post.image"
          :src="post.image"
          :alt="post.imageAlt"
          loading="lazy"
          class="h-[170px] w-full rounded-[12px] object-cover lg:order-last lg:h-[200px] lg:w-[300px] lg:shrink-0"
        />
        <div class="lg:min-w-0 lg:flex-1">
          <div class="flex flex-wrap items-center gap-3">
            <time
              :datetime="post.date"
              class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted lg:text-[12px]"
            >
              {{ formatDate(post.date) }}
            </time>
            <span
              v-if="post.draft"
              class="rounded-full bg-[#FCE3DD] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#C0503F] lg:text-[10px]"
            >
              Draft
            </span>
          </div>
          <h3
            class="mt-2 font-display text-[22px] font-medium leading-[1.18] tracking-[-0.01em] text-default lg:mt-2.5 lg:text-[26px] lg:leading-[1.16]"
          >
            {{ post.title }}
          </h3>
          <p
            class="mt-1.5 text-[14px] leading-relaxed text-muted lg:mt-2.5 lg:text-[16px]"
            :class="post.image ? 'lg:max-w-[560px]' : 'lg:max-w-[620px]'"
          >
            {{ post.description }}
          </p>
        </div>
      </NuxtLink>
    </div>

    <p v-else class="mx-auto max-w-[1040px] px-7 py-20 text-center text-muted lg:px-14">
      First post is on its way.
    </p>
  </div>
</template>
