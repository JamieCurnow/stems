<script setup lang="ts">
// Public marketing blog index (default chrome, not the app shell). Posts come
// from @nuxt/content; drafts are hidden in production and shown in dev so the
// surface can be previewed before publishing. Stems brand: white canvas, EB
// Garamond display headings, peach accent, hairline dividers (no cards).
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

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const formatDate = (d: string) => dateFmt.format(new Date(d))
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-14 text-default sm:px-6 sm:py-16">
    <header class="mb-10 border-b border-default pb-6">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">Blog</p>
      <h1 class="mt-2 font-display text-4xl font-medium tracking-tight text-default sm:text-5xl">
        Notes from the field
      </h1>
      <p class="mt-4 max-w-prose text-lg leading-relaxed text-muted">
        Growing, seasonality, and the people behind the flowers. Practical things for growers, and a little on
        why local and in season is worth the bother.
      </p>
    </header>

    <ul v-if="posts && posts.length" class="divide-y divide-default">
      <li v-for="post in posts" :key="post.path">
        <NuxtLink
          :to="post.path"
          class="group -mx-4 flex flex-col gap-2 px-4 py-7 transition-colors hover:bg-primary/5"
        >
          <div class="flex flex-wrap items-center gap-3">
            <time
              :datetime="post.date"
              class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
            >
              {{ formatDate(post.date) }}
            </time>
            <span
              v-if="post.draft"
              class="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-primary"
            >
              Draft
            </span>
          </div>
          <h2
            class="font-display text-2xl font-medium leading-tight tracking-tight text-default transition-colors group-hover:text-primary sm:text-3xl"
          >
            {{ post.title }}
          </h2>
          <p class="max-w-prose text-base leading-relaxed text-muted">
            {{ post.description }}
          </p>
        </NuxtLink>
      </li>
    </ul>

    <p v-else class="py-16 text-center text-muted">First post is on its way.</p>
  </div>
</template>
