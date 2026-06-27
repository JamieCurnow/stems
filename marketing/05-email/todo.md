# Email TODO

Lifecycle email to growers. Infra (Resend + EmailScheduler) already exists. This
is mostly content and timing. Ordered by priority.

## Audit what already exists

- [ ] TODO(jamie): list the lifecycle / transactional emails already in
      `server/emails/` so we don't duplicate (welcome, magic link, etc.).
- [ ] Confirm which are transactional vs marketing, and how sending / scheduling
      is wired (`server/utils/email.ts`, `EmailScheduler`).
- [ ] TODO(jamie): confirm unsubscribe / preferences handling for non-
      transactional emails.

## Write the core lifecycle (one ask each, signed "Jamie")

- [ ] Welcome a new grower: one ask, set up your page. Lead with the relief.
- [ ] Nudge to add first flowers (if none added after a day or two).
- [ ] Nudge to share their link (once their page is worth sharing): put it at the
      top of your Instagram bio.
- [ ] Seasonal "what's in season" check-in: gentle, season-framed, one ask to
      update availability.
- [ ] Founder outreach "how did you find us?": plain question from Jamie, invites
      a real reply.

## Get the details right

- [ ] Write warm, specific subject lines for each (no shouting, no "!").
- [ ] Every email: one ask, one link, sign off `Jamie`, no marketing closer.
- [ ] Read each one aloud. If it sounds like it's performing, rewrite.
- [ ] Set sensible timing / triggers with the team (signup, no-flowers-added,
      page-not-shared, seasonal cadence).

## Cadence

- [ ] Keep volume low and well spaced. Lighter in peak season, slightly more in
      the quiet winter planning months.

## Hard rules

- [ ] One thing per email.
- [ ] Sign off `Jamie`.
- [ ] No em-dashes, no hype, no marketing closers, UK spelling.
