<script setup lang="ts">
// Single blog post (default chrome). Renders a @nuxt/content post with the Stems
// brand: white canvas, EB Garamond display heading, peach accents. The header
// and body sit in a 720px reading column centred in an 880px container; an
// optional feature image (`post.image`) breaks out to the full 880px between
// them. Drafts 404 in production but stay reachable in dev.
definePageMeta({ layout: 'default' })

const route = useRoute()

const { data: post } = await useAsyncData(`blog-${route.path}`, () =>
  queryCollection('blog').path(route.path).first()
)

if (!post.value || (!import.meta.dev && post.value.draft)) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })
}

const ogImage = computed(() => post.value?.ogImage ?? 'https://stems.market/og.png')

useSeoMeta({
  // The global title template (brief 02) appends ' · Stems'.
  title: () => post.value?.title,
  description: () => post.value?.description,
  ogTitle: () => post.value?.title,
  ogDescription: () => post.value?.description,
  ogType: 'article',
  ogImage,
  twitterCard: 'summary_large_image',
  twitterTitle: () => post.value?.title,
  twitterDescription: () => post.value?.description,
  twitterImage: ogImage
})

// Article schema always; FAQPage Q&A when the post declares `faq` frontmatter.
// defineQuestion entries are auto-collected into a FAQPage by nuxt-schema-org —
// what AI answer engines and Google rich results read.
useSchemaOrg([
  defineArticle({
    headline: post.value?.title,
    description: post.value?.description,
    datePublished: post.value?.date,
    image: ogImage.value,
    inLanguage: 'en-GB'
  }),
  ...(post.value?.faq ?? []).map((f) => defineQuestion({ name: f.question, acceptedAnswer: f.answer }))
])

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const formattedDate = computed(() => (post.value?.date ? dateFmt.format(new Date(post.value.date)) : ''))
</script>

<template>
  <article v-if="post" class="mx-auto max-w-[880px] px-6 py-12 text-default sm:px-8 lg:py-16">
    <!-- Header column — narrower reading measure, centred in the container. -->
    <header class="mx-auto max-w-[720px]">
      <NuxtLink
        to="/blog"
        class="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted transition-colors hover:text-primary lg:text-[12px]"
      >
        <UIcon name="i-lucide-arrow-left" class="size-3.5" />
        Blog
      </NuxtLink>

      <div class="mt-6 flex flex-wrap items-center gap-3 lg:mt-7">
        <time
          :datetime="post.date"
          class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted lg:text-[12px]"
        >
          {{ formattedDate }}
        </time>
        <span
          v-if="post.draft"
          class="rounded-full bg-[#FCE3DD] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#C0503F] lg:text-[10px]"
        >
          Draft
        </span>
      </div>

      <h1
        class="mt-3 font-display text-[31px] font-medium leading-[1.12] tracking-[-0.012em] text-default lg:mt-3.5 lg:text-[48px] lg:leading-[1.08] lg:tracking-[-0.015em]"
      >
        {{ post.title }}
      </h1>
      <p
        v-if="post.description"
        class="mt-3.5 text-[16px] leading-relaxed text-muted lg:mt-[18px] lg:text-[19px]"
      >
        {{ post.description }}
      </p>
    </header>

    <!-- Optional feature image — breaks out to the full 880px container width. -->
    <img
      v-if="post.image"
      :src="post.image"
      :alt="post.imageAlt"
      class="mt-7 h-[230px] w-full rounded-[14px] object-cover lg:mt-9 lg:h-[440px] lg:rounded-[18px] lg:shadow-[0_24px_56px_-30px_rgba(33,30,26,0.4)]"
    />

    <!-- Body column — same 720px reading measure. @nuxt/ui's Prose components
         render headings with their own utility classes (default sans, font-bold),
         so the `prose-headings:` variants don't reach them. Target the rendered
         elements directly with arbitrary descendant selectors: the display serif
         on headings, plus the warm body ink, list-marker tint, and soft-bordered
         inline links from the design spec. -->
    <div class="mx-auto mt-10 max-w-[720px] border-t border-default pt-8 lg:pt-10">
      <div
        class="prose max-w-none [&_:is(h1,h2,h3,h4)]:font-display [&_:is(h1,h2,h3,h4)]:font-medium [&_:is(h1,h2,h3,h4)]:tracking-tight [&_h2]:mt-8 [&_h2]:text-[22px] [&_p]:text-[15px] [&_p]:leading-[1.66] [&_p]:text-[#4A453E] [&_li]:text-[15px] [&_li]:leading-[1.66] [&_li]:text-[#4A453E] [&_li]:marker:text-[#C9A99E] [&_:is(ul,ol)]:pl-6 [&_strong]:font-semibold [&_strong]:text-default [&_a]:border-b [&_a]:border-[rgba(232,119,103,0.34)] [&_a]:text-primary [&_a]:no-underline lg:[&_h2]:mt-[42px] lg:[&_h2]:text-[28px] lg:[&_p]:text-[17px] lg:[&_p]:leading-[1.72] lg:[&_li]:text-[17px]"
      >
        <ContentRenderer :value="post" />
      </div>

      <div class="mt-12 border-t border-default pt-6 lg:mt-14">
        <NuxtLink
          to="/blog"
          class="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary transition-colors hover:opacity-80 lg:text-[12px]"
        >
          <UIcon name="i-lucide-arrow-left" class="size-3.5" />
          All posts
        </NuxtLink>
      </div>
    </div>
  </article>
</template>
