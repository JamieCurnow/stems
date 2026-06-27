# Marketing status: the lead's desk

**Read this first.** When Jamie drops in and asks "what's next for marketing?",
this is the doc that answers it. It's the cross-stream snapshot: where every
stream is, what the next move is, and what's waiting on Jamie. Keep it current.
Deep detail lives in each channel folder; this is the map above them.

Last updated: **2026-06-26** (initial marketing system build)

---

## The one-paragraph read

The marketing system was just set up from scratch, modelled on the Edgelands
playbook but rebuilt for Stems' opposite posture: warm, honest, relationship-
driven, no hype. The strategy is locked (`00-foundations/positioning.md`), the
voice is locked (master + social), every channel has a folder, the technical SEO
gaps are documented as dispatchable dev briefs (`seo-roadmap/`), the About page
is written and live, and the first blog post is drafted. **Nothing is published
or live to the public yet beyond the About page copy.** The bottleneck now is the
same as Edgelands': distribution, not docs. The single most important next move
is **grower outreach** (`02-grower-outreach/`): bringing on the first 5-10 real
growers, one warm conversation at a time. Everything else supports that.

## What was built tonight (2026-06-26)

- **Strategy & voice** (`00-foundations/`): `positioning.md`, `brand-voice.md`
  (master), `social-voice.md`, `bio-and-handles.md`.
- **Channel folders** (each with README + todo): `01-instagram`,
  `02-grower-outreach` (the rich one), `03-seo-content`, `04-word-of-mouth`,
  `05-email`, `06-community-press`, `07-aeo-geo`.
- **SEO content**: `03-seo-content/pillar-articles.md` (8-post backlog) +
  `prompt-blog-article.md` (writing brief).
- **First blog post drafted**: `content/blog/how-to-sell-flowers-locally-without-a-website.md`
  (`draft: true`, has FAQ schema). Ready to publish once the content system lands
  and the one `TODO(jamie)` figure is checked (there isn't one in this post; it
  avoids invented stats).
- **About page rewritten and live**: `app/pages/about.vue` (was a "coming soon"
  placeholder, now real copy in brand voice).
- **Technical SEO roadmap** (`seo-roadmap/`): gap analysis + 4 dispatchable dev
  briefs (sitemap/robots, global schema, content/blog system, marketing home).
- **Bug fix**: `stems.app` → `stems.market` in `discover.vue` and
  `onboarding.vue` (every new grower was seeing the wrong domain). See validation.
- **`APP_INFO.md`** filled in (was an empty template).
- **`metrics.md`**: the "activated growers, not vanity" measurement plan.

---

## ✅ Validation checklist (things for Jamie to check & confirm)

Work through these when you wake up. They're the human gates and the "is this
actually right?" checks. None block reading the docs; they block going live.

### Must confirm before anything ships
- [x] **Domain.** Confirmed canonical: **stems.market** (Jamie, 2026-06-27).
  Two product refs fixed (`discover.vue`, `onboarding.vue`). The full `stems.app`
  sweep (incl. internal `roadmap/*.md`) is part of the dev handoff, brief 02.
- [x] **Voice docs** approved (Jamie, 2026-06-27).
- [x] **About page** copy approved (Jamie, 2026-06-27).
- [x] **First blog post** approved (Jamie, 2026-06-27). Still `draft: true`;
  goes live once the content system (`seo-roadmap/03`) is built.

### Confirm the strategy
- [ ] **Positioning** (`00-foundations/positioning.md`): is "the shopfront /
  Linktree for small growers, grower is the hero" the right framing? This is the
  load-bearing decision; everything hangs off it.
- [ ] **The 10-activated-growers V1 goal** (`metrics.md`): agree that's the
  target, not signups/traffic.

### Facts to verify (the TODO(jamie) list, consolidated)
- [ ] **Flowers from the Farm**: membership numbers (I wrote ~1,000+), regional
  group structure, and their group rules before posting in any FFTF space.
- [ ] **British Flowers Week 2026 dates** (it's a June thing; confirm exact dates).
- [ ] **Handles**: check availability and claim `@stems` (or agreed fallback) on
  Instagram + anywhere else (see `00-foundations/bio-and-handles.md`).
- [ ] **Imported-flowers stat**: if we ever cite "X% of UK cut flowers are
  imported", find a real source first. The current blog post deliberately avoids
  the number.
- [ ] **Email templates**: audit existing `server/emails/` + unsubscribe handling
  before writing lifecycle emails (`05-email/`).

### Decisions I need from you
- [x] **Technical SEO**: green-lit for a developer agent (Jamie, 2026-06-27). The
  full handoff is written at `seo-roadmap/HANDOFF.md` (sequences all four briefs,
  Cloudflare traps, verification). Dispatch a dev agent with: "Read
  `marketing/seo-roadmap/HANDOFF.md` and execute it." The blog post goes live once
  brief 03 (content system) lands.
- [ ] **Founder bio**: write 1-2 warm sentences in your voice for press/outreach
  (placeholder in `bio-and-handles.md`).
- [ ] **Marketing home page** (`seo-roadmap/04`): keep `/` redirecting to
  `/discover`, or build a real growers-first landing at `/`? I recommend building
  it; needs your yes.

---

## Stream-by-stream

| # | Stream | State | Next move | Blocked on |
|---|---|---|---|---|
| 00 | **Foundations** | Voice + positioning + bios locked. | Claim handles. Write founder bio. | Jamie (handles, bio) |
| 01 | **Instagram** | Strategy + todo written. No account yet. | Create account, set bio, post 3-5 starter posts (grower features need growers first). | Jamie (account), grower outreach |
| 02 | **Grower outreach** | Rich playbook + templates written. **The priority.** | Build the list of 10-20 wantable local growers; warm outreach to first 5. | Jamie (the actual conversations) |
| 03 | **SEO content** | Plan + 8-post backlog + 1 post drafted. | Publish post #1 (needs content system + fact-check). Write post #2. | Content system (`seo-roadmap/03`), Jamie (publish gate) |
| 04 | **Word of mouth** | Strategy written. Manual in V1. | Feature first growers so they share; ask them to tell their group. | Downstream of having growers |
| 05 | **Email** | Strategy + sequences outlined. Resend infra exists. | Audit `server/emails/`, draft welcome + share-nudge. | Jamie (email audit), partly dev |
| 06 | **Community & press** | Strategy written. | Build the press/podcast/FFTF list; warm founder intros. | Jamie (founder-led) |
| 07 | **AEO / GEO** | Strategy written. Near-zero competition. | Ship FAQ schema (via content system), be genuinely present in grower communities. | `seo-roadmap`, Jamie (community) |
| — | **SEO tech** (`seo-roadmap/`) | 4 dev briefs + `HANDOFF.md` written. Green-lit. Nothing implemented yet. | Dispatch a dev agent: "Read `marketing/seo-roadmap/HANDOFF.md` and execute it." | Dev agent run |

## What I (Claude, marketing lead) can mostly run myself

- Drafting all written content: blog posts, Instagram captions, email copy,
  outreach templates, press pitches.
- The technical SEO work, on a branch, if you green-light it (sitemap, robots,
  schema, content/blog system, home page). All briefed in `seo-roadmap/`.
- Building the research lists (hashtags, county grower groups, podcasts,
  directories), then handing you the shortlist.
- Keeping this doc, each channel `todo.md`, and `metrics.md` current.

## What I have to outsource to Jamie

- **The actual grower conversations.** Relationship-driven outreach is your real
  voice, not a template send. I draft, you send and talk.
- **Account creation** needing phone/SMS verification, and posting from accounts.
- **The publish gate** on anything factual (confirming figures, final tone call).
- **Spending money** (any tools, ads if ever, gifted anything).
- **Confirming the domain** and the strategic framing above.

## Pointers

- Strategy & "what is this": `00-foundations/positioning.md`.
- Voice: `00-foundations/brand-voice.md` (master) + `social-voice.md`.
- The priority channel: `02-grower-outreach/`.
- Blog plan + writing brief: `03-seo-content/`.
- Technical SEO work: `seo-roadmap/README.md`.
- Numbers: `metrics.md`.

## Suggested first session back

> "Read marketing/STATUS.md. I've confirmed the domain is stems.market and read
> the voice docs. Let's do the grower outreach list: help me find 15 small
> British flower growers near me worth approaching, then draft the first outreach
> message from 02-grower-outreach."

Or, if you'd rather unblock publishing:

> "Read marketing/STATUS.md and seo-roadmap/README.md. Green-light: implement the
> sitemap/robots and global schema briefs on a branch, then the content system so
> the first blog post can go live."
