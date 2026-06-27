# 03 — Content / blog system

**Goal:** turn the `/blog` "coming soon" placeholder into a real, SEO-grade blog
powered by `@nuxt/content` v3. Markdown posts live in `content/blog/*.md`, render
at `/blog/<slug>`, carry `Article` + `FAQPage` JSON-LD, hide drafts in production
(and from the sitemap), and are styled in the Stems brand.

**Depends on:** 02 (inherits `site.url`, the `%s · Stems` title template, and the
`/og.png` fallback). 01's sitemap source is extended here.
**Blocks:** nothing, but it's the organic-growth engine the marketing plan needs.

---

## What already exists (don't rebuild)

- `app/pages/blog.vue` — current placeholder ("Coming soon"). This brief
  **replaces** it with a real index. Note: it's currently a flat
  `blog.vue`; the blog needs an index **and** a `[slug]` route, so move to a
  `blog/` directory (see below).
- `app/pages/@[handle]/index.vue` — reference for the per-page `useSeoMeta` +
  JSON-LD pattern already used in this repo.
- `nuxt.config.ts` — has the `ignore: ['**/*.md']` rule (keeps catalog docs out
  of Nuxt). **This is the rule `@nuxt/content` collides with — see the gotcha.**
- The first blog post markdown **is being authored separately** and will land in
  `content/blog/`. Build the rendering system; do not write post content.
- Brand voice for any UI copy: `marketing/00-foundations/brand-voice.md`,
  `positioning.md`. Brand tokens (EB Garamond display, peach-500, prose width):
  `DESIGN.md` and `app/assets/css/main.css`.

---

## Cloudflare Workers + `@nuxt/content` v3 — read first

This is the trickiest config in the whole roadmap. Three things matter:

### 1. The `ignore` negation (critical)

`nuxt.config.ts` currently has, in two places:

```ts
ignore: ['**/*.md'],            // top-level Nuxt
nitro: {
  ignore: ['**/*.md'],          // Nitro
  imports: { dirs: ['!**/*.md'] }
}
```

That hides **all** markdown from Nuxt — including the blog corpus, which would
make Content see zero posts. Add the re-include negation (gitignore semantics: a
later `!` un-ignores) exactly as LAND does:

```ts
ignore: ['**/*.md', '!content/**/*.md'],
nitro: {
  ignore: ['**/*.md', '!content/**/*.md'],
  imports: { dirs: ['!**/*.md'] }
}
```

### 2. Module registration order

Register `@nuxt/content` **before** the SEO modules (LAND puts it right after
`@nuxt/ui`):

```ts
modules: [
  '@nuxt/eslint',
  '@nuxt/ui',
  '@nuxt/content', // ← add here
  '@pinia/nuxt',
  '@vueuse/nuxt',
  '@vite-pwa/nuxt',
  '@nuxtjs/sitemap',
  '@nuxtjs/robots',
  'nuxt-schema-org',
  'nuxt-seo-utils',
  'nuxt-site-config'
]
```

### 3. Content v3 storage on Workers

`@nuxt/content` v3 builds a SQLite-backed content database at build time. On the
`cloudflare-module` preset this ships as a static asset and queries run in the
Worker — the LAND repo proves this works with no extra `content: {}` config
beyond defaults. **Risk to verify:** run a full `npm run build` early and confirm
the content DB is emitted and queryable in `wrangler dev` (not just `nuxt dev`).
If the bundled DB doesn't resolve on Workers, the documented fallback is setting
`content.database` to a D1 binding — but try the default first; LAND did not need it.

---

## What to build

### 1. Install

```bash
npm install @nuxt/content
```

### 2. `content.config.ts` (project root)

Mirror the LAND schema. Stems-flavoured:

```ts
import { defineContentConfig, defineCollection, z } from '@nuxt/content'

// Blog collection for the Stems marketing blog. Posts live in
// `content/blog/*.md` and render at `/blog/<filename>`. This schema is the
// contract any blog-generation workflow writes against.
export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page', // routable `path` + rendered body
      source: 'blog/**/*.md',
      schema: z.object({
        // ISO date, quoted in frontmatter ('YYYY-MM-DD'). Sorts lexicographically.
        date: z.string(),
        // The single SEO keyword this post targets.
        keyword: z.string().optional(),
        tags: z.array(z.string()).default([]),
        // Drafts stay in the corpus but are hidden from the index, post nav,
        // and the sitemap in production.
        draft: z.boolean().default(false),
        // Optional per-post share image; falls back to the site /og.png (brief 02).
        ogImage: z.string().optional(),
        // Optional FAQ pairs → FAQPage JSON-LD (defineQuestion) in [slug].vue.
        faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional()
      })
    })
  }
})
```

`title` and `description` come free from `@nuxt/content`'s built-in page fields
(first H1 / frontmatter), so they're not redeclared here — same as LAND.

### 3. Pages: move `blog.vue` → `blog/index.vue` + add `blog/[slug].vue`

Delete `app/pages/blog.vue`. Create `app/pages/blog/index.vue` and
`app/pages/blog/[slug].vue`. Both use `layout: 'default'` (the public chrome,
same as the current placeholder and the legal pages).

**`app/pages/blog/index.vue`** — adapt LAND's index, restyled to Stems brand
(white canvas, EB Garamond display headings, peach accent, `max-w-3xl` prose
column, hairline dividers — match `privacy.vue` and `discover.vue`):

```vue
<script setup lang="ts">
definePageMeta({ layout: 'default' })

useSeoMeta({
  // The global title template appends ' · Stems' (brief 02).
  title: 'Blog',
  description:
    'Notes from Stems: growing, seasonality, and the people behind the flowers.'
})

// Drafts hidden in production; shown in dev so posts can be previewed.
const { data: posts } = await useAsyncData('blog-index', () => {
  const query = queryCollection('blog').order('date', 'DESC')
  return import.meta.dev ? query.all() : query.where('draft', '=', false).all()
})

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const formatDate = (d: string) => dateFmt.format(new Date(d))
</script>
```

Template: a branded hero (eyebrow + `font-display` H1, same language as
`about.vue`/`discover.vue`) over a `divide-y divide-default` list of post links,
each showing the date, title (`font-display`, hover `text-primary`), and
description. Show a "Draft" pill when `post.draft` (dev only). Empty state in the
existing voice ("First post is on its way.").

**`app/pages/blog/[slug].vue`** — adapt LAND's `[slug].vue`:

```vue
<script setup lang="ts">
const route = useRoute()

const { data: post } = await useAsyncData(`blog-${route.path}`, () =>
  queryCollection('blog').path(route.path).first()
)

// Missing post, or a draft in production, is a 404. Drafts stay reachable in dev.
if (!post.value || (!import.meta.dev && post.value.draft)) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })
}

const ogImage = computed(() => post.value?.ogImage ?? 'https://stems.market/og.png')

useSeoMeta({
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
  ...(post.value?.faq ?? []).map((f) =>
    defineQuestion({ name: f.question, acceptedAnswer: f.answer })
  )
])
</script>

<template>
  <article v-if="post" class="...">
    <!-- branded header: back-to-blog link, date, font-display H1, description -->
    <div class="prose mx-auto max-w-3xl">
      <ContentRenderer :value="post" />
    </div>
  </article>
</template>
```

`defineArticle` / `defineQuestion` are auto-imported by `nuxt-schema-org`
(registered in brief 02). `inLanguage: 'en-GB'` matches the site locale.

### 4. Prose styling (Stems brand)

`@nuxt/ui` provides a `prose` typography layer. Style the rendered body in the
Stems voice (see `DESIGN.md` / `main.css`):
- `max-w-3xl` reading column, generous leading.
- Headings in `font-display` (EB Garamond), body in Inter.
- Links in `text-primary` with `underline underline-offset-2` (match the legal
  pages' link treatment).
- Peach-500 accents for the eyebrow / pull elements.
- Keep the canvas pure white; no boxes (borderless Toast x Instagram language).

If `@nuxt/ui`'s default prose needs overriding, do it with Tailwind utilities /
the `prose` config — **no custom CSS files** (per `.agent/rules/styling.md`).

### 5. Extend the sitemap source (from brief 01)

Brief 01 created `server/api/__sitemap__/urls.ts` returning grower URLs from D1.
Add published blog posts to it, using the **explicit Nitro import** (the
auto-import mis-resolves to the client type in a server file — this exact gotcha
is documented in LAND's source):

```ts
import { queryCollection } from '@nuxt/content/nitro'
// ... existing grower query ...

const posts = await queryCollection(event, 'blog').where('draft', '=', false).all()
const postUrls = posts.map((p) => ({ loc: p.path, lastmod: p.date }))

return [...growerUrls, ...postUrls]
```

Drafts are excluded here so they never reach the sitemap even while in the corpus.

---

## Done when

- [ ] `@nuxt/content` installed and registered before the SEO modules.
- [ ] The `ignore` negation `'!content/**/*.md'` is added in **both** the
      top-level and `nitro` ignore arrays; catalog docs (`*.md` elsewhere) still
      stay invisible to Nuxt.
- [ ] `content.config.ts` defines the `blog` collection (date, keyword, tags,
      draft, ogImage, faq).
- [ ] `app/pages/blog.vue` removed; `blog/index.vue` lists published posts
      (drafts shown only in dev) and `blog/[slug].vue` renders a post with
      `<ContentRenderer>`, Stems-branded prose, Article + FAQPage JSON-LD.
- [ ] A draft post 404s in production and renders in dev; a published post
      renders in both.
- [ ] The sitemap source includes published posts (`/blog/<slug>`) with `lastmod`.
- [ ] `npm run build` **and** a `wrangler dev` smoke test both serve a real post
      (confirms the content DB resolves on the Workers runtime).
- [ ] `npm run typecheck && npm run lint` clean.
