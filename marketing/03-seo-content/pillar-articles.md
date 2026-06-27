# SEO content plan — pillar articles & backlog

The blog has two jobs, in this order:

1. **Reach growers** (our acquisition target). Posts that a small grower searches
   for, reads, and thinks "this gets it", then finds Stems at the end.
2. **Reach buyers** searching for local/British/seasonal flowers, and the AI
   answer engines they increasingly ask first (see `../07-aeo-geo/`).

Every post follows `../00-foundations/brand-voice.md`. Real knowledge, no
invented stats (use `TODO(jamie)` for any figure), one varied soft CTA near the
end, internal links between posts. Posts live in `content/blog/*.md` once the
content system lands (`../seo-roadmap/03-content-blog-system.md`).

## Frontmatter shape (the contract)

```yaml
---
title: String                 # H1 on the page and in search results
description: String           # meta description shown in SERPs
date: 'YYYY-MM-DD'            # ISO, quoted
keyword: String              # the single target keyword
tags: [growers, selling]     # 1-3 tags
draft: true                  # true until fact-checked + ready; hidden in prod
faq:                          # optional, drives FAQPage JSON-LD (good for AEO)
  - question: String
    answer: String
---
```

## Status legend

`published` · `drafted` (file exists, `draft: true`, awaiting fact-check/publish)
· `unclaimed` (next to write)

## Backlog

Grower-facing posts come first: they serve acquisition, which is the V1 goal.

| # | Title | Target keyword | Audience | Status | Notes |
|---|---|---|---|---|---|
| 1 | How to sell your flowers locally without building a website | how to sell flowers locally | Grower | **drafted** | `content/blog/how-to-sell-flowers-locally-without-a-website.md`. The flagship. Doubles as a manifesto. Has FAQ schema. |
| 2 | How to price cut flowers for florists (a grower's guide) | how to price cut flowers | Grower | unclaimed | Per-stem, bunch-of-ten, British-grown premium. Needs real price ranges, `TODO(jamie)` until checked. High-intent, low competition. |
| 3 | Where to buy British-grown flowers near you | british grown flowers near me | Buyer | unclaimed | The buyer-side counterpart. Explains seasonality, links to /discover. Strong AEO target. |
| 4 | What flowers are in season in the UK right now | flowers in season UK | Both | unclaimed | Evergreen, refreshable per season. Big search volume. Could become a recurring monthly "what's in season" series. |
| 5 | How to find a local flower grower for your wedding | local wedding flowers / british wedding flowers | Buyer | unclaimed | Event florists + couples. Seasonal-colour realities, lead times, why local. Links to /discover. |
| 6 | Selling to florists: what they actually want from a local grower | sell flowers to florists | Grower | unclaimed | Reliability, consistent availability, clear pricing, easy reordering. Positions Stems as the availability layer. |
| 7 | Grown not flown: the case for local flowers | grown not flown / why buy local flowers | Buyer | unclaimed | The movement piece. Positive case only (see voice doc), no guilt. `TODO(jamie)` on the imported-flowers figure. |
| 8 | How to take good photos of your flowers for selling | (long-tail, grower) | Grower | unclaimed | Practical, generous, useful. Builds goodwill, light Stems tie-in (your page is only as good as the photos). |

Add new topics as searches and grower questions surface. Keep grower-facing and
buyer-facing roughly balanced, but lead with grower-facing while acquisition is
the goal.

## How to write the next one

Use `prompt-blog-article.md` in this folder as the brief. Pick the top
`unclaimed` row, write it to `content/blog/<slug>.md` with `draft: true`, run it
past the voice doc, flag any figures as `TODO(jamie)`, and leave it for Jamie to
fact-check and publish (flip `draft` to false).

## Internal linking map (build this as posts land)

- #1 (sell locally) links to #2 (pricing) and #6 (selling to florists) and /about.
- #3 (buy british near you) links to #4 (in season) and #7 (grown not flown) and /discover.
- #4 (in season) is the hub: most posts can link to it.
- Every post links to either /login (grower CTA) or /discover (buyer CTA), not both.
