# Copywriting

Rules for user-facing copy: page text, headings, SEO `useSeoMeta` titles/descriptions,
email templates, UI strings, toasts, and button labels. Anything a user reads.

## No em-dashes (or en-dashes)

**Never use `—` (em-dash) or `–` (en-dash) in copy.** They read as AI-generated and
Jamie doesn't want them. Use one of these instead, whichever fits:

- a **comma** for a quick aside: `growers, a place to find them`
- a **colon** to introduce a list or definition: `as a grower: your handle, bio, photos`
- a **period** to split into two sentences: `…analytics tool. Until then, your choice is stored.`
- **parentheses** for a true aside: `the functional ones (you can't stay signed in otherwise)`
- a plain **hyphen** `-` only where a literal dash is genuinely wanted

This applies to copy only. Em-dashes in code comments aren't great either, but they're
not the target, so don't rewrite working code just to remove them.

Quick check before shipping copy: `grep -rn $'[—–]' <files>` should return nothing.

## No direct comparisons to Linktree (or Bandcamp, etc.)

**Never name or directly compare Stems to Linktree, Bandcamp, or any other product
in user-facing copy.** The "Linktree / Bandcamp for a flower grower" line is an
internal positioning shorthand only (it lives in `APP_INFO.md` and
`marketing/00-foundations/positioning.md`). It must not appear, even by metaphor,
on any page, email, or social post.

Two reasons: it dates and cheapens the brand by tethering it to someone else's
product, and the forced metaphor ("your flowers are the songs, your handle is the
link in the bio") is exactly the "performing" tone the voice guide rejects.

Instead, say what Stems is in its own plain words: a single, good-looking page for
your flowers that you share with one link. Lead with the grower's real situation
(the same list typed into a dozen chats), not an analogy to another app.
