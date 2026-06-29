<script setup lang="ts">
// Public legal page (default chrome). The "change preferences" button reuses
// the real consent system: useConsent() + the same LayoutConsentManageDialog
// the cookie banner opens, so the live state shown here is the actual choice.
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Cookie Policy',
  description: 'What cookies Stems uses, what they do, and how to change your choice.'
})

const lastUpdated = '19 June 2026'

const cookies = [
  {
    name: 'better-auth.session_token',
    category: 'Functional',
    purpose: 'Keeps you signed in. Without it you would have to sign in again on every page.',
    lifetime: 'Up to 7 days, refreshed while you stay active',
    party: 'First-party'
  },
  {
    name: 'stems_consent',
    category: 'Functional',
    purpose: 'Stores your cookie-banner choice (analytics + marketing).',
    lifetime: '6 months',
    party: 'First-party'
  },
  {
    name: 'stems_ref',
    category: 'Functional',
    purpose: 'Remembers a referral code from a /r/CODE link so it can be applied when you sign up.',
    lifetime: '30 days',
    party: 'First-party'
  }
]

const consent = useConsent()
const showManage = ref(false)
</script>

<template>
  <article class="mx-auto max-w-3xl px-4 py-14 text-default sm:px-6 sm:py-16">
    <header class="mb-10 border-b border-default pb-6">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">Cookie Policy</p>
      <h1 class="mt-2 font-display text-4xl font-medium tracking-tight text-default sm:text-5xl">
        What we set, and why
      </h1>
      <p class="mt-3 text-sm text-muted">Last updated {{ lastUpdated }}</p>
    </header>

    <div class="space-y-8 text-base leading-relaxed text-default">
      <section>
        <h2 class="mb-2 font-display text-2xl font-medium text-default">The short version</h2>
        <p>
          We only set a handful of strictly-functional cookies to keep you signed in and remember your
          preferences. We don't currently run any analytics or marketing cookies. The consent controls below
          are kept ready for a future privacy-friendly analytics tool. Until then, your choice is simply
          stored, and you can change it any time.
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <UButton color="primary" size="sm" class="rounded-full px-4" @click="showManage = true">
            Change your preferences
          </UButton>
          <span class="text-xs text-muted">
            Currently: analytics {{ consent.state.value.analytics ? 'on' : 'off' }} · marketing
            {{ consent.state.value.marketing ? 'on' : 'off' }}
          </span>
        </div>
      </section>

      <section>
        <h2 class="mb-3 font-display text-2xl font-medium text-default">Every cookie we use</h2>
        <div class="overflow-x-auto rounded-lg border border-default">
          <table class="w-full border-collapse text-sm">
            <thead class="bg-muted text-left">
              <tr>
                <th class="px-3 py-2 font-medium text-default">Name</th>
                <th class="px-3 py-2 font-medium text-default">Category</th>
                <th class="px-3 py-2 font-medium text-default">Purpose</th>
                <th class="px-3 py-2 font-medium text-default">Lifetime</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in cookies" :key="row.name" class="border-t border-default align-top">
                <td class="px-3 py-2">
                  <code class="text-xs">{{ row.name }}</code>
                  <p class="mt-1 text-[10px] uppercase tracking-wide text-dimmed">{{ row.party }}</p>
                </td>
                <td class="px-3 py-2 text-muted">{{ row.category }}</td>
                <td class="px-3 py-2 text-muted">{{ row.purpose }}</td>
                <td class="px-3 py-2 text-muted">{{ row.lifetime }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 class="mb-2 font-display text-2xl font-medium text-default">Analytics</h2>
        <p>
          We don't currently use any analytics or marketing cookies. Nothing tracks you across the site. If we
          add a privacy-friendly analytics tool in future, it will be off until you opt in via the controls
          above, and we'll list exactly what it sets right here first.
        </p>
      </section>

      <section>
        <h2 class="mb-2 font-display text-2xl font-medium text-default">Third parties</h2>
        <p>
          The only other third-party that may load is Stripe, and only when a grower clicks through to pay.
          Stripe sets its own cookies to process the payment securely. See our
          <NuxtLink to="/privacy" class="text-primary underline underline-offset-2 hover:opacity-80">
            Privacy Policy
          </NuxtLink>
          for the full list of the services we use.
        </p>
      </section>

      <section>
        <h2 class="mb-2 font-display text-2xl font-medium text-default">How to block cookies</h2>
        <p>
          You can block all cookies in your browser settings, but the site won't work properly without the
          functional ones. You won't be able to stay signed in. For the easier route, use the banner or the
          button above.
        </p>
      </section>
    </div>

    <footer class="mt-12 border-t border-default pt-6 text-sm text-muted">
      See also the
      <NuxtLink to="/privacy" class="text-primary underline underline-offset-2 hover:opacity-80">
        Privacy Policy </NuxtLink
      >, or head back to
      <NuxtLink to="/discover" class="text-primary underline underline-offset-2 hover:opacity-80">
        Discover </NuxtLink
      >.
    </footer>

    <LayoutConsentManageDialog v-model:open="showManage" />
  </article>
</template>
