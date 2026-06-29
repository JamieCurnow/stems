// Feeds dynamic URLs to @nuxtjs/sitemap. Wired in via `sitemap.sources` in
// nuxt.config.ts. Two sources:
//   1. Public @handle grower pages — every published grower (isGrower = true),
//      the same filter the /discover search uses.
//   2. Published blog posts (@nuxt/content) — drafts are excluded so they never
//      reach the sitemap even while they sit in the content corpus.
//
// `queryCollection` is imported explicitly from @nuxt/content/nitro — the bare
// auto-import mis-resolves to the client (1-arg) type in a server file, and
// @nuxt/content/server routes through an internal HTTP query that fails here.
// `defineSitemapEventHandler` is auto-imported by @nuxtjs/sitemap.
import { eq } from 'drizzle-orm'
import { queryCollection } from '@nuxt/content/nitro'
import { useDb } from '~~/server/utils/db'
import { profile } from '~~/server/db/schema'

export default defineSitemapEventHandler(async (event) => {
  const db = useDb(event)

  const growers = await db
    .select({ handle: profile.handle, updatedAt: profile.updatedAt })
    .from(profile)
    .where(eq(profile.isGrower, true))
    .all()

  const growerUrls = growers.map((g) => ({
    // The browser URL carries the '@'; the stored handle does not.
    loc: `/@${g.handle}`,
    lastmod: g.updatedAt.toISOString()
  }))

  const posts = await queryCollection(event, 'blog').where('draft', '=', false).all()
  const postUrls = posts.map((post) => ({
    loc: post.path,
    lastmod: post.date
  }))

  return [...growerUrls, ...postUrls]
})
