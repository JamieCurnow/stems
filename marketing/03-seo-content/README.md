# 03: SEO content (brief)

Short on purpose. The full pillar-articles plan and the first post are authored
separately (see `pillar-articles.md`, written elsewhere by Jamie). This README
is just the strategy frame.

## Why this channel

SEO is the slow, compounding channel. It is mostly a **buyer-side** acquisition
route (the demand a grower would otherwise have to bring themselves), plus a way
to reach growers searching how to sell their flowers. It pays off over months,
not weeks, so we plant it early and let it grow while outreach and Instagram do
the near-term work.

## Who we reach

- **Buyers** searching for local, British-grown, seasonal flowers.
- **Growers** searching how to sell their flowers locally and look professional.

## What we want to rank for

Two intents, both genuine and both low-competition for this niche:

- Buyer intent: "local flowers near me", "british grown wedding flowers", "buy
  flowers direct from grower", "seasonal flowers [month/county]", "british
  flowers for weddings", and seasonality searches generally.
- Grower intent: "how to sell flowers locally", "sell cut flowers from my
  garden", "showing my flower availability", and similar.

## Voice and approach

- Master `brand-voice.md` governs all long-form. Open on the concrete, be
  genuinely useful and accurate, weave the Stems mention in calmly near the end,
  and vary the soft CTA post to post.
- No invented stats. Pull a real source or leave `TODO(jamie)`.
- The British-grown angle is the positive case, never the guilt case.

## How the content is planned

- `pillar-articles.md` (authored separately): the pillar-and-cluster plan,
  target keywords, and the first post. Do not duplicate it here.
- Technical SEO (sitemap, schema, metadata) is tracked separately in
  `../seo-roadmap/`. This folder is content strategy, not the technical build.

## Automated drafting (weekly)

A GitHub Action drafts one post a week so the backlog keeps moving without a
person sitting down to write. It drafts and opens a PR; it never merges, so
nothing goes live without a human.

- **`.github/workflows/blog-generation.yml`** runs 07:00 UTC every Monday (and
  on demand via "Run workflow"). It runs Claude Code headless against the
  orchestration prompt in `blog-generation-task.md`: pick the top `unclaimed`
  row from `pillar-articles.md`, write it into `content/blog/<slug>.md` with
  `draft: false` (ready to publish), open a PR, and flip that row to `drafted`.
  It never merges and never deploys.
- **`.github/workflows/blog-preview.yml`** builds the PR (schema gate) and
  deploys it to staging so the post can be read at
  `stems-staging.jamiecurnow.workers.dev/blog` before merging.
- **The human gate is the merge:** review the PR, fact-check and clear every
  `TODO(jamie)` (the post ships `draft: false`, so it publishes on merge), then
  merge. Only merge once the TODOs are gone.
- **Setup:** needs the `ANTHROPIC_API_KEY` repo secret (required) and a
  `BLOG_BOT_TOKEN` PAT (recommended, so the bot's PR triggers the build check).
  See the header comment in `blog-generation.yml` for the exact scopes.

## Read these next

1. `todo.md`
2. `pillar-articles.md` (authored separately by Jamie)
3. `../seo-roadmap/` (technical SEO build)
4. `../07-aeo-geo/README.md` (answer-first content compounds for AI engines too)
