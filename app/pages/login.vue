<script setup lang="ts">
import { authClient } from '~/utils/auth-client'

useSeoMeta({ title: 'Sign in', robots: 'noindex,nofollow' })

const route = useRoute()

// Kept in a const (not inlined in the template) so the Stems token
// can't end up nested inside a Vue interpolation — `{{ … 'Sign in to Stems' }}`
// is a compile error before the placeholder is substituted.
const appName = 'Stems'

const email = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const sent = ref(false)

// Returning users land on ?redirect (if it's a safe in-app path) or /app.
// Brand-new accounts always go to /onboarding. Better Auth picks
// newUserCallbackURL vs callbackURL based on whether verify created the
// user, so this Just Works for both.
const redirectTo = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') ? r : '/account'
})

const referralCode = computed(() => {
  const r = route.query.ref
  return typeof r === 'string' ? r : null
})

const linkError = computed(() => (route.query.error ? true : false))

async function submit() {
  loading.value = true
  error.value = null
  try {
    const { error: err } = await authClient.signIn.magicLink({
      email: email.value,
      callbackURL: redirectTo.value,
      newUserCallbackURL: '/onboarding',
      errorCallbackURL: '/login?error=link'
    })
    if (err) throw new Error(err.message ?? 'Could not send your sign-in link.')
    sent.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    loading.value = false
  }
}

function reset() {
  sent.value = false
  error.value = null
}
</script>

<template>
  <div class="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-sm flex-col justify-center px-6 py-12">
    <!-- Sent state: calm, box-free confirmation -->
    <div v-if="sent" class="text-center">
      <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-peach-100 text-primary">
        <UIcon name="i-lucide-mail-check" class="size-7" />
      </div>
      <h1 class="mt-5 font-display text-3xl font-medium text-default">Check your inbox</h1>
      <p class="mx-auto mt-2 max-w-xs text-sm text-muted">
        We've sent a sign-in link to <span class="text-default">{{ email }}</span
        >. It works once and expires in 15 minutes.
      </p>
      <p class="mt-6 text-sm text-muted">
        Didn't get it? Check spam, or
        <button type="button" class="font-medium text-primary hover:underline" @click="reset">
          try a different email
        </button>
        .
      </p>
    </div>

    <!-- Sign-in form -->
    <div v-else>
      <div class="text-center">
        <h1 class="font-display text-3xl font-medium text-default">Sign in to {{ appName }}</h1>
        <p class="mx-auto mt-2 max-w-xs text-balance text-sm text-muted">
          Enter your email and we'll send you a one-time sign-in link. No password needed.
        </p>
      </div>

      <UAlert
        v-if="linkError"
        icon="i-lucide-triangle-alert"
        color="warning"
        variant="subtle"
        class="mt-6"
        title="That link didn't work"
        description="It may have expired or already been used. Request a fresh one below."
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

      <form class="mt-7 flex flex-col gap-4" @submit.prevent="submit">
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
          Email me a sign-in link
        </UButton>
      </form>
    </div>
  </div>
</template>
