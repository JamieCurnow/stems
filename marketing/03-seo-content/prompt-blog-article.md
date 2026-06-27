# Brief: write a Stems blog post

Use this as the standing brief whenever you draft a blog post for Stems. Hand it
the topic (a row from `pillar-articles.md`) and go.

## Before you write

Read these, in order:
1. `../00-foundations/positioning.md` — what Stems is (the shopfront for small
   growers; grower is the hero we acquire; no cut, no middleman).
2. `../00-foundations/brand-voice.md` — the master written voice. This governs
   every sentence.
3. `pillar-articles.md` — the backlog, the frontmatter contract, and the
   internal-linking map.

## The job

Write one blog post, in Stems' voice, that is genuinely useful to its audience
(grower or buyer) and earns its mention of Stems honestly.

## Hard rules

- **No em-dashes. Anywhere. Ever.** Commas, full stops, colons, brackets.
- **UK spelling and usage throughout.**
- **No invented facts.** No made-up stats, no fake quotes, no invented price
  figures. If you need a number (e.g. the share of UK cut flowers that are
  imported), write `TODO(jamie)` and carry on. A `TODO` is cheaper than a wrong
  fact.
- **No flower puns.** Not in the title, not anywhere.
- **No hype.** No "revolutionise", "skyrocket", "game-changing", no exclamation
  marks doing emotional work.
- **One H1 only** (the `title` in frontmatter). The body uses `##` (H2) and
  below. Do not put an H1 in the body.
- **Open on the concrete** (a flower, a season, a real moment or question), never
  on "In this article we will explore...".
- **Answer-first.** Especially for "how to" and "what is" posts, give the useful
  answer early and plainly. This is what ranks and what AI answer engines cite.

## Structure

1. **Intro (2-3 short paragraphs):** open on something real, frame the question,
   hint at the answer.
2. **Body (3-6 `##` sections):** the genuinely useful content. Short paragraphs.
   Lists where they help. Plain language. Real knowledge.
3. **Where Stems fits (1 paragraph):** calm, capability-first, varied from post
   to post (never the same boilerplate). What Stems does, plainly, then the next
   step. Link to `/login` (grower CTA) or `/discover` (buyer CTA), not both.
4. **The short version (optional):** a tight wrap-up for the skimmers and the
   answer engines.

## Frontmatter

Fill the contract from `pillar-articles.md`. Always include `title`,
`description`, `date` (today, ISO quoted), `keyword`, `tags`. Set `draft: true`
(Jamie publishes by flipping it). Add a `faq` block of 2-4 real Q&As where the
topic suits it, it drives FAQPage schema and helps AEO. Mirror the FAQ answers
in plain language in the body too.

## Internal links

Add 1-3 internal links to other posts or to `/about`, `/discover`, `/login`
following the linking map in `pillar-articles.md`. Markdown links: `[text](/path)`.

## After you write

- Re-read against the voice doc. If a sentence sounds like a brand or a pitch
  deck, rewrite it.
- Self-check: `grep` your draft for em-dashes (none allowed) and for an H1 in the
  body (none allowed).
- Save to `content/blog/<slug>.md`. Slug is lowercase, hyphenated, keyword-led.
- Update the row in `pillar-articles.md` to `drafted` with the file path.
- Leave it `draft: true`. Tell Jamie what needs fact-checking (every `TODO`).
