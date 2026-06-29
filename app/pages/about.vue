<script setup lang="ts">
// Public marketing page. Uses the slim `default` chrome (Stems wordmark +
// sign-in), not the signed-in app shell, these are shareable web pages.
// Copy follows marketing/00-foundations/brand-voice.md (warm, calm, honest,
// no em-dashes, UK spelling). Speaks to the grower first.
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'About',
  description:
    'Stems is the shareable shopfront for small flower growers. Local-grown flowers, straight from the grower. One link for what you have in season, that you update in minutes.'
})
</script>

<template>
  <article class="mx-auto max-w-3xl px-4 py-14 text-default sm:px-6 sm:py-16">
    <header class="mb-10 border-b border-default pb-6">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">About</p>
      <h1 class="mt-2 font-display text-4xl font-medium tracking-tight text-default sm:text-5xl">
        A shopfront for the people who grow the flowers
      </h1>
      <p class="mt-4 max-w-prose text-lg leading-relaxed text-muted">
        Stems is a single, good-looking page for what you have in season, that you share with one link and
        update in the time it takes to have a coffee. Local-grown flowers, straight from the grower.
      </p>
    </header>

    <div class="space-y-10 text-base leading-relaxed text-default">
      <section>
        <h2 class="mb-3 font-display text-2xl font-medium text-default">The 6am DM pile</h2>
        <p>
          If you grow flowers and sell them locally, you already know the feeling. The dahlias are going three
          times a week, the sweet peas are everywhere, and your phone is full of the same question in twelve
          different chats: what have you got in this week, and how much?
        </p>
        <p class="mt-3">
          Your flowers sell themselves. They just need somewhere to be seen that isn't buried in a DM thread
          or a spreadsheet you email out on a Sunday night. Instagram is lovely for the photos and hopeless
          for "ranunculus, 60p a stem, ready Friday". A proper website is a project you don't have time for in
          the season.
        </p>
        <p class="mt-3">Stems is the bit in the middle. The shopfront, without the website.</p>
      </section>

      <section>
        <h2 class="mb-3 font-display text-2xl font-medium text-default">How it works</h2>
        <p>
          You claim a handle, set up your page with your farm name, your area, and a line about who you are,
          then list what you've got: the variety, the colour, the price per stem, and whether it's ready now
          or coming soon. Add a photo. That's it.
        </p>
        <p class="mt-3">
          Your page lives at one clean link. You put it at the top of your Instagram, in your bio, in your
          email signature, on a market sign. When someone asks what's in, you send the link instead of typing
          it all out again. As the season turns and you cut, you update the list, and your page shows when it
          was last updated so people know it's current.
        </p>
        <p class="mt-3">
          People can also find you the other way round. Anyone can search Stems for local growers by name or
          area, without signing in, and land straight on your page.
        </p>
      </section>

      <section>
        <h2 class="mb-3 font-display text-2xl font-medium text-default">Why local, why seasonal</h2>
        <p>
          Most cut flowers sold in this country were grown a long way away and flown in, passing through an
          auction and a few hands before they reach a vase. They arrive with no name and no season attached.
        </p>
        <p class="mt-3">
          Flowers grown down the road are a different thing entirely. They were in a field this morning. They
          smell of something. They come with a name, a place, and a person, and they're whatever is genuinely
          in season, which is the whole point. Florists building a story for their own customers want that. So
          do the people who'd rather buy a bucket of just-cut stems than a bunch in cellophane.
        </p>
        <p class="mt-3">
          There's a real and growing movement of British growers doing exactly this, properly. Stems is a tool
          for that movement, not a sermon about it. We're for the named local grower and the turning season.
          We'll leave the lecturing to someone else.
        </p>
      </section>

      <section>
        <h2 class="mb-3 font-display text-2xl font-medium text-default">What Stems is not</h2>
        <p>This matters as much as what it is, so we'll say it plainly.</p>
        <ul class="ml-5 mt-3 list-disc space-y-2 marker:text-dimmed">
          <li>
            <strong>We don't take a cut.</strong> Stems doesn't sit between you and the sale. There's no
            commission, no bidding, no buyer who belongs to us instead of you.
          </li>
          <li>
            <strong>We're not a faceless middleman.</strong> When someone wants your flowers, they contact
            you, the way they always have: WhatsApp, email, Instagram, however you like to be reached. The
            relationship stays yours.
          </li>
          <li>
            <strong>We're not the Dutch auction online.</strong> No anonymous stock, no race to the bottom.
            Named people, local flowers, this week.
          </li>
        </ul>
        <p class="mt-3">
          Stems gives you a good shopfront and gets out of the way. What you do with it is yours.
        </p>
      </section>

      <section class="rounded-2xl bg-primary/5 px-6 py-8 sm:px-8">
        <h2 class="mb-3 font-display text-2xl font-medium text-default">Set up your page</h2>
        <p class="max-w-prose">
          It takes an evening, and most of that is choosing photos. Claim your handle, list what you've got,
          and put the link in your bio. The flowers will do the rest.
        </p>
        <div class="mt-6 flex flex-col gap-3 sm:flex-row">
          <UButton to="/login" color="primary" size="lg" class="justify-center rounded-full px-7 font-medium">
            List your flowers
          </UButton>
          <UButton
            to="/discover"
            color="neutral"
            variant="soft"
            size="lg"
            class="justify-center rounded-full px-7"
          >
            Find a grower near you
          </UButton>
        </div>
      </section>

      <section>
        <p class="text-sm text-muted">
          Questions, or want to say hello? Email
          <a
            class="text-primary underline underline-offset-2 hover:opacity-80"
            href="mailto:hello@stems.market"
          >
            hello@stems.market </a
          >. A real person reads it.
        </p>
      </section>
    </div>
  </article>
</template>
