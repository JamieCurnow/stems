# 05: Email

Lifecycle email to growers. Read the email section of
`../00-foundations/brand-voice.md`; it is the law for this folder.

## Why this channel

Email is how we help a grower go from "signed up" to "live page shared in my
bio", and how we stay quietly present through the season. It is also the most
direct line to a grower who isn't on Instagram much. It is not a newsletter
machine; it is a small number of well-timed, genuinely helpful messages.

## The infrastructure already exists

The app already sends transactional and scheduled email via **Resend** (templates
in `server/emails/`, send/schedule layer in `server/utils/email.ts`, scheduling
via the `EmailScheduler` Durable Object). So this is a content and timing job,
not a build-from-scratch job. TODO(jamie): confirm which lifecycle emails already
exist in `server/emails/` before writing new ones, to avoid duplicates.

## Voice rules for every email (from brand-voice.md)

- Sign off `Jamie`. Not "The Stems Team", not "Best, Jamie". Just `Jamie`.
  (From-name can be "Stems"; the human signs off as Jamie.)
- Subject lines warm and specific, never shouty. "your page is ready when you
  are" beats "Get Started With Stems Today!".
- **One thing per email. One ask, one link.**
- No marketing closers ("We can't wait to see you bloom!"). Human, then stop.
- No em-dashes, UK spelling, no hype.

## Who we reach

Growers, at the moments that matter to them. We do not email buyers in V1 (the
grower owns the buyer relationship).

## What good looks like

- New growers add their first flowers and put their link in their bio.
- Growers keep their availability current through the season.
- Founder outreach emails get real replies (we learn how growers found us and
  what they need).

## The lifecycle (one ask each)

### 1. Welcome a new grower

- Triggered when a grower signs up.
- Warm, short, one ask: set up your page. Lead with the relief, not the feature.
- Link straight to the page builder / their page.

### 2. Nudge: add your first flowers

- A day or two after signup if no flowers added.
- One ask: add a few of what you've got this week. Reassure it takes minutes.

### 3. Nudge: share your link

- Once they have a page worth sharing.
- One ask: put your link at the top of your Instagram bio. Maybe a one-line
  reminder of why (so people stop DMing you for your list).

### 4. Seasonal "what's in season" check-in

- A gentle, recurring nudge through the season to update availability.
- Framed as the season turning ("the sweet peas will be coming three times a
  week soon"), not as a chore reminder. One ask: update your page for the week.

### 5. Founder outreach: "how did you find us?"

- From Jamie, plainly, to newer growers.
- One ask: a genuine question, how did you find Stems, and is it useful? This is
  research and relationship, not marketing. Replies are gold.

## Cadence and restraint

- Few emails, well spaced. A grower in peak season is cutting at 6am, not reading
  their inbox. Respect that.
- Lighter touch in the busy months, slightly more present in the quiet planning
  season (winter).
- Always easy to stop hearing from us. TODO(jamie): confirm unsubscribe / email
  preferences handling for non-transactional emails.

## Read these next

1. `todo.md`
2. `../00-foundations/brand-voice.md` (email section)
3. `server/emails/` (existing templates) and `server/utils/email.ts`
