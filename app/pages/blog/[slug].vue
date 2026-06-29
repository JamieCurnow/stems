<script setup lang="ts">
// Single blog post (default chrome). Renders a @nuxt/content post with the Stems
// brand: white canvas, EB Garamond display heading, peach accents, max-w-3xl
// prose column. Drafts 404 in production but stay reachable in dev.
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
  <article v-if="post" class="mx-auto max-w-3xl px-4 py-14 text-default sm:px-6 sm:py-16">
    <header class="mb-10 border-b border-default pb-6">
      <NuxtLink
        to="/blog"
        class="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted transition-colors hover:text-primary"
      >
        <UIcon name="i-lucide-arrow-left" class="size-3.5" />
        Blog
      </NuxtLink>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <time :datetime="post.date" class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          {{ formattedDate }}
        </time>
        <span
          v-if="post.draft"
          class="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-primary"
        >
          Draft
        </span>
      </div>

      <h1
        class="mt-3 font-display text-4xl font-medium leading-tight tracking-tight text-default sm:text-5xl"
      >
        {{ post.title }}
      </h1>
      <p v-if="post.description" class="mt-4 max-w-prose text-lg leading-relaxed text-muted">
        {{ post.description }}
      </p>
    </header>

    <!-- @nuxt/ui's Prose components render the headings with their own utility
         classes (default sans, font-bold), so the typography `prose-headings:`
         variants don't reach them. Target the rendered elements directly with
         arbitrary descendant selectors to give them the site display serif. -->
    <div
      class="prose max-w-none [&_:is(h1,h2,h3,h4)]:font-display [&_:is(h1,h2,h3,h4)]:font-medium [&_:is(h1,h2,h3,h4)]:tracking-tight"
    >
      <ContentRenderer :value="post" />
    </div>

    <div class="mt-14 border-t border-default pt-6">
      <NuxtLink
        to="/blog"
        class="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary transition-colors hover:opacity-80"
      >
        <UIcon name="i-lucide-arrow-left" class="size-3.5" />
        All posts
      </NuxtLink>
    </div>
  </article>
</template>
