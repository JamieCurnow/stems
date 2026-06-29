<script setup lang="ts">
import { authClient } from '~/utils/auth-client'

useSeoMeta({ title: 'Sign in', robots: 'noindex,nofollow' })

const route = useRoute()

// Kept in a const (not inlined in the template) so the Stems token
// can't end up nested inside a Vue interpolation — `{{ … 'Sign in to Stems' }}`
// is a compile error before the placeholder is substituted.
const appName = 'Stems'

// Two steps: collect the email, then the 6-digit code that gets emailed back.
// We deliberately use a *code* rather than a magic link: on iOS, a home-screen
// PWA runs in a cookie jar isolated from Safari, and a magic link always opens
// in Safari, so its session cookie lands in the wrong container and the installed
// app stays logged out. A code typed back into the PWA sets the cookie in the
// PWA's own context, so the session sticks.
const step = ref<'email' | 'code'>('email')

const email = ref('')
const otp = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

// Returning users land on ?redirect (if it's a safe in-app path) or /account.
// Brand-new accounts have no profile yet, so the `onboarding` middleware on
// /account (and the other gated pages) bounces them to /onboarding for us.
const redirectTo = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') ? r : '/account'
})

const referralCode = computed(() => {
  const r = route.query.ref
  return typeof r === 'string' ? r : null
})

// Older magic links can still bounce back here with ?error=link.
const linkError = computed(() => (route.query.error ? true : false))

async function sendCode() {
  loading.value = true
  error.value = null
  try {
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({
      email: email.value,
      type: 'sign-in'
    })
    if (err) throw new Error(err.message ?? 'Could not send your sign-in code.')
    step.value = 'code'
    otp.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    loading.value = false
  }
}

async function verify() {
  loading.value = true
  error.value = null
  try {
    const { error: err } = await authClient.signIn.emailOtp({
      email: email.value,
      otp: otp.value
    })
    if (err) throw new Error(err.message ?? 'That code was incorrect or has expired.')
    // Session cookie is now set in this context; the destination's middleware
    // routes new (profile-less) users on to /onboarding.
    await navigateTo(redirectTo.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    loading.value = false
  }
}

function reset() {
  step.value = 'email'
  otp.value = ''
  error.value = null
}
</script>

<template>
  <div class="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-sm flex-col justify-center px-6 py-12">
    <!-- Code step: enter the 6-digit code we just emailed -->
    <div v-if="step === 'code'">
      <div class="text-center">
        <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-peach-100 text-primary">
          <UIcon name="i-lucide-mail-check" class="size-7" />
        </div>
        <h1 class="mt-5 font-display text-3xl font-medium text-default">Enter your code</h1>
        <p class="mx-auto mt-2 max-w-xs text-balance text-sm text-muted">
          We've sent a 6-digit code to <span class="text-default">{{ email }}</span
          >. It works once and expires in 10 minutes.
        </p>
      </div>

      <form class="mt-7 flex flex-col gap-4" @submit.prevent="verify">
        <UFormField label="Sign-in code" required class="w-full">
          <UInput
            v-model="otp"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            size="lg"
            required
            placeholder="123456"
            class="w-full text-center tracking-[0.5em]"
          />
        </UFormField>

        <p v-if="error" class="text-sm text-error">{{ error }}</p>

        <UButton type="submit" size="lg" :loading="loading" block class="font-medium"> Sign in </UButton>
      </form>

      <p class="mt-6 text-center text-sm text-muted">
        Didn't get it? Check spam, or
        <button type="button" class="font-medium text-primary hover:underline" @click="reset">
          use a different email
        </button>
        .
      </p>
    </div>

    <!-- Email step -->
    <div v-else>
      <div class="text-center">
        <h1 class="font-display text-3xl font-medium text-default">Sign in to {{ appName }}</h1>
        <p class="mx-auto mt-2 max-w-xs text-balance text-sm text-muted">
          Enter your email and we'll send you a one-time sign-in code. No password needed.
        </p>
      </div>

      <UAlert
        v-if="linkError"
        icon="i-lucide-triangle-alert"
        color="warning"
        variant="subtle"
        class="mt-6"
        title="That link didn't work"
        description="It may have expired or already been used. Request a fresh code below."
      />

      <UAlert
        v-if="referralCode"
        icon="i-lucide-gift"
        color="success"
        variant="subtle"
        class="mt-6"
        :title="`Referral applied: ${referralCode}`"
        description="Your discount will apply at checkout."
      />

      <form class="mt-7 flex flex-col gap-4" @submit.prevent="sendCode">
        <UFormField label="Email" required class="w-full">
          <UInput
            v-model="email"
            type="email"
            size="lg"
            autocomplete="email"
            required
            placeholder="you@example.com"
            class="w-full"
          />
        </UFormField>

        <p v-if="error" class="text-sm text-error">{{ error }}</p>

        <UButton type="submit" size="lg" :loading="loading" block class="font-medium">
          Email me a sign-in code
        </UButton>
      </form>
    </div>
  </div>
</template>
