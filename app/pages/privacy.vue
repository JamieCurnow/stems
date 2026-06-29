<script setup lang="ts">
// Public legal page. Uses the slim `default` chrome (Stems wordmark + sign-in),
// not the signed-in app shell, these are shareable web pages. Content is
// Stems-specific: magic-link auth (no passwords), public grower profiles, and
// the deliberate no-in-app-messaging contact handoff.
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Privacy Policy',
  description: 'How Stems collects, uses, and protects your personal data. UK GDPR-compliant privacy policy.'
})

const lastUpdated = '19 June 2026'
</script>

<template>
  <article class="mx-auto max-w-3xl px-4 py-14 text-default sm:px-6 sm:py-16">
    <header class="mb-10 border-b border-default pb-6">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">Privacy Policy</p>
      <h1 class="mt-2 font-display text-4xl font-medium tracking-tight text-default sm:text-5xl">
        How we handle your data
      </h1>
      <p class="mt-3 text-sm text-muted">Last updated {{ lastUpdated }}</p>
    </header>

    <div class="space-y-8 text-base leading-relaxed text-default">
      <section>
        <h2 class="mb-2 font-display text-2xl font-medium text-default">Who we are</h2>
        <p>
          Stems is a directory for local flower growers, a place to find growers near you and contact them
          directly. The service is operated by Guardline Ltd, a company registered in England and Wales
          (company number 13323382), which is the data controller for the personal data described here.
        </p>
        <p class="mt-3">
          Questions about this policy or about your data: email
          <a
            class="text-primary underline underline-offset-2 hover:opacity-80"
            href="mailto:hello@stems.market"
          >
            hello@stems.market </a
          >.
        </p>
      </section>

      <section>
        <h2 class="mb-2 font-display text-2xl font-medium text-default">What we collect</h2>
        <ul class="ml-5 list-disc space-y-2 marker:text-dimmed">
          <li>
            <strong>Account data.</strong> Your email address and name. Stems uses magic-link sign-in, so we
            never ask for or store a password.
          </li>
          <li>
            <strong>Your grower page.</strong> Anything you publish as a grower: your handle, display name,
            bio, the area you grow in, photos of your flowers, your listings, and the contact methods you
            choose to show (a WhatsApp number, a contact email, an Instagram handle). This is intentionally
            <strong>public</strong>: it's what buyers see and search.
          </li>
          <li>
            <strong>Billing data.</strong> Handled by Stripe. We see a customer ID and your subscription
            status. We never see your card details.
          </li>
          <li>
            <strong>Email preferences.</strong> Whether you've opted in or out of product and marketing
            emails.
          </li>
          <li>
            <strong>Usage analytics.</strong> We don't currently run any third-party analytics. If we add a
            privacy-friendly tool in future it'll be off until you opt in, and we'll detail it in the
            <NuxtLink to="/cookies" class="text-primary underline underline-offset-2 hover:opacity-80">
              Cookie Policy </NuxtLink
            >.
          </li>
          <li>
            <strong>Server logs.</strong> Cloudflare logs the IP address, request URL, and a timestamp for
            each request, retained briefly for security and abuse prevention.
          </li>
        </ul>
      </section>

      <section>
        <h2 class="mb-2 font-display text-2xl font-medium text-default">
          Contacting a grower: we stay out of it
        </h2>
        <p>
          Stems has no in-app messaging. When a buyer taps a grower's contact button we simply hand off to
          that app: WhatsApp, your email client, or Instagram. The conversation happens directly between the
          two of you. We don't see it, send it, or store it, and a buyer doesn't need a Stems account to
          browse or to get in touch.
        </p>
        <p class="mt-3">
          Once you're handed off, that provider's own privacy policy applies to whatever you share there.
        </p>
      </section>

      <section>
        <h2 class="mb-2 font-display text-2xl font-medium text-default">What we use it for</h2>
        <ul class="ml-5 list-disc space-y-2 marker:text-dimmed">
          <li>Running your account and publishing your grower page so buyers can find you.</li>
          <li>Sending sign-in (magic) links and other essential service emails.</li>
          <li>Billing you, handling your subscription, and processing cancellations.</li>
          <li>
            Sending product and marketing emails, only if you opt in. There's an unsubscribe link in every
            one.
          </li>
          <li>Measuring how the site is used so we can improve it (subject to your cookie choice).</li>
          <li>Crediting your referrer if you signed up through a referral link.</li>
        </ul>
        <p class="mt-3">
          Legal bases: <em>contract</em> (running your account and page),
          <em>legitimate interest</em> (security, fraud prevention, and anonymous analytics where you've
          consented), <em>consent</em> (marketing emails and analytics cookies), and
          <em>legal obligation</em> (keeping financial records).
        </p>
      </section>

      <section>
        <h2 class="mb-2 font-display text-2xl font-medium text-default">Who we share it with</h2>
        <ul class="ml-5 list-disc space-y-2 marker:text-dimmed">
          <li><strong>Stripe</strong>: payment processing.</li>
          <li><strong>Cloudflare</strong>: hosting (Workers, the D1 database, and R2 file storage).</li>
          <li><strong>Resend</strong>: sending sign-in, transactional, and marketing email.</li>
        </ul>
        <p class="mt-3">
          We never sell your data, and we don't share it with anyone for advertising. (Separately, when you
          contact a grower we hand you off to WhatsApp, your email provider, or Instagram, as noted above.)
        </p>
      </section>

      <section>
        <h2 class="mb-2 font-display text-2xl font-medium text-default">Where it lives</h2>
        <p>
          Your account, page, and preferences live in a Cloudflare D1 database (SQLite, replicated across
          Cloudflare's edge network). Photos live in Cloudflare R2. Backups are handled automatically by
          Cloudflare. Stripe stores billing data in its own infrastructure under its own policy.
        </p>
      </section>

      <section>
        <h2 class="mb-2 font-display text-2xl font-medium text-default">How long we keep it</h2>
        <ul class="ml-5 list-disc space-y-2 marker:text-dimmed">
          <li>Active accounts: while your account is open.</li>
          <li>Closed accounts: removed on request, or within 12 months of the account becoming inactive.</li>
          <li>Financial records: 6 years (a UK statutory requirement).</li>
          <li>Server logs: a rolling few days at the Cloudflare edge.</li>
        </ul>
      </section>

      <section>
        <h2 class="mb-2 font-display text-2xl font-medium text-default">Your rights</h2>
        <p>Under UK GDPR you can:</p>
        <ul class="ml-5 mt-2 list-disc space-y-2 marker:text-dimmed">
          <li>Ask for a copy of the data we hold about you.</li>
          <li>Ask us to correct anything inaccurate.</li>
          <li>Ask us to delete your account and the data attached to it.</li>
          <li>
            Withdraw consent for analytics or marketing at any time (via the cookie banner or any unsubscribe
            link).
          </li>
          <li>
            Complain to the ICO (<a
              class="text-primary underline underline-offset-2 hover:opacity-80"
              href="https://ico.org.uk/make-a-complaint/"
              target="_blank"
              rel="noopener"
              >ico.org.uk</a
            >).
          </li>
        </ul>
        <p class="mt-3">
          Email
          <a
            class="text-primary underline underline-offset-2 hover:opacity-80"
            href="mailto:hello@stems.market"
          >
            hello@stems.market
          </a>
          to exercise any of these.
        </p>
      </section>

      <section>
        <h2 class="mb-2 font-display text-2xl font-medium text-default">Children</h2>
        <p>
          Stems isn't aimed at children and isn't intended for use by anyone under 16. We don't knowingly
          collect data from children. If you believe a child has given us their data, email us and we'll
          remove it.
        </p>
      </section>

      <section>
        <h2 class="mb-2 font-display text-2xl font-medium text-default">Changes to this policy</h2>
        <p>
          If we make material changes we'll update the date at the top of this page and, where it affects you,
          let signed-in growers know by email. The live version here is always the authoritative one.
        </p>
      </section>
    </div>

    <footer class="mt-12 border-t border-default pt-6 text-sm text-muted">
      See also the
      <NuxtLink to="/cookies" class="text-primary underline underline-offset-2 hover:opacity-80">
        Cookie Policy </NuxtLink
      >, or head back to
      <NuxtLink to="/discover" class="text-primary underline underline-offset-2 hover:opacity-80">
        Discover </NuxtLink
      >.
    </footer>
  </article>
</template>
