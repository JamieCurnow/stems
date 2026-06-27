# 04: Word of mouth

Referrals and word of mouth, the organic engine behind the grower-to-grower loop
in `../00-foundations/positioning.md`.

## Why this channel

The growth loop is grower-to-grower. A grower's page is also our best advert to
other growers, because the people most likely to admire a grower's setup are
other growers in the same local scene, the same county group, the same Flowers
from the Farm meet-up. When that recommendation comes from a peer, it carries far
more weight than anything we could say.

## Be honest about V1: this is manual

There is **no built-in referral product feature in V1**. No payments, so no
referral credit, no "invite and earn", no automated reward loop. We are not
pretending otherwise. In V1, word of mouth is something we encourage by hand and
by being worth talking about, not a mechanic we ship.

That is fine. At this stage, ten genuinely happy growers telling their friends is
the right shape of growth anyway.

## Who we reach

Other growers, reached through a grower they already trust. Secondarily, the
buyers a grower brings, who tell other buyers ("this florist gets her flowers
direct from a grower near here").

## What good looks like

- Growers sharing their own page link unprompted (in their bio, on Stories, to
  their florist contacts).
- A grower mentioning Stems to their FFTF group or local grower friends.
- New growers arriving because a peer told them, not because we found them.

## The levers we actually have in V1

### 1. The existing "invite a grower" link on /discover

`/discover` already has an "Invite a grower" button that opens a pre-filled
email (`mailto:`) so anyone can pass Stems on. It is the one referral affordance
in the product today.

- TODO(jamie): the pre-filled email body currently points to `https://stems.app`.
  Production is `stems.market`. Update the link in `app/pages/discover.vue` so
  invites land on the right domain. (Flag to engineering; do not change code from
  this marketing folder.)
- TODO(jamie): consider warming the default invite copy so it reads in Stems
  voice (warm, plain, no hype) rather than a generic line.

### 2. Grower-invites-grower, by hand

- When a grower is happy, ask them gently to mention Stems to a grower friend or
  their county group. Once, warmly, never pushy.
- Make it easy: give them the `/discover` invite link, or a one-line message they
  can forward.

### 3. Featuring growers so they share

- The single most reliable way to get a grower to share Stems is to **feature
  them** (Instagram, `/discover`). People share things that make them look good.
- A credited feature gives the grower something proud to repost, which puts Stems
  in front of their audience, including other growers.
- This is the same move as the outreach thank-you (see `../02-grower-outreach`).
  Featuring is referral fuel.

### 4. Asking happy growers to tell their FFTF group

- A recommendation inside a Flowers from the Farm regional group, from a trusted
  member, is the highest-value word of mouth we can earn.
- We never post promo into those groups ourselves. We earn the member doing it
  for us by being genuinely useful to them first.

## Tone

- Asking for a share should feel like a friend asking a favour, not a growth
  team running a campaign. One warm ask, then leave it.
- Never incentivise with anything that feels transactional in V1 (we couldn't
  anyway, no payments). The reward is being celebrated, and a tool that genuinely
  helps.

## When the product catches up

When V1 grows into payments and accounts mature, revisit whether a real
referral feature is worth building. Note it, do not build messaging around it
now. TODO(jamie): park "should we ever build a referral feature?" for post-V1.

## Read these next

1. `todo.md`
2. `../02-grower-outreach/README.md` (featuring as thank-you = referral fuel)
3. `../05-email/README.md` (the lifecycle emails that prompt a share)
