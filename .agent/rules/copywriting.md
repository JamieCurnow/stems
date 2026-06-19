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
