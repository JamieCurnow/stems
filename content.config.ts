import { defineContentConfig, defineCollection, z } from '@nuxt/content'

// Blog collection for the Stems marketing blog. Posts live in
// `content/blog/*.md` and render at `/blog/<filename>`. This schema is the
// contract any blog-generation workflow writes against; `title` and
// `description` come free from @nuxt/content's built-in page fields (first H1 /
// frontmatter), so they're not redeclared here.
export default defineContentConfig({
  collections: {
    blog: defineCollection({
      // `page` gives each post a routable `path` and a rendered body.
      type: 'page',
      source: 'blog/**/*.md',
      schema: z.object({
        // ISO date, quoted in frontmatter ('YYYY-MM-DD'). Sorts lexicographically.
        date: z.string(),
        // The single SEO keyword this post targets.
        keyword: z.string().optional(),
        tags: z.array(z.string()).default([]),
        // Drafts stay in the corpus but are hidden from the index, post nav, and
        // the sitemap in production. Flip to false (or drop it) to publish.
        draft: z.boolean().default(false),
        // Optional per-post share image; falls back to the site /og.png.
        ogImage: z.string().optional(),
        // Optional FAQ pairs → FAQPage JSON-LD (defineQuestion) in [slug].vue.
        faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional()
      })
    })
  }
})
