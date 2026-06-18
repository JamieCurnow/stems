<script setup lang="ts">
import { authClient } from '~/utils/auth-client'

useSeoMeta({ title: 'Sign in', robots: 'noindex,nofollow' })

const route = useRoute()

// Kept in a const (not inlined in the template) so the {{APP_NAME}} token
// can't end up nested inside a Vue interpolation — `{{ … 'Sign in to {{APP_NAME}}' }}`
// is a compile error before the placeholder is substituted.
const appName = '{{APP_NAME}}'

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
  return typeof r === 'string' && r.startsWith('/') ? r : '/app'
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
  <div class="mx-auto flex min-h-[calc(100dvh-12rem)] max-w-md items-center px-6 py-12">
    <UCard class="w-full">
      <template #header>
        <h1 class="text-2xl font-semibold">
          {{ sent ? 'Check your inbox' : `Sign in to ${appName}` }}
        </h1>
        <p class="text-sm text-gray-600">
          {{
            sent
              ? `We've sent a sign-in link to ${email}. It works once and expires in 15 minutes.`
              : "Enter your email and we'll send you a one-time sign-in link. No password needed."
          }}
        </p>
      </template>

      <UAlert
        v-if="linkError && !sent"
        icon="i-lucide-triangle-alert"
        color="warning"
        variant="subtle"
        class="mb-4"
        title="That link didn't work"
        description="It may have expired or already been used. Request a fresh one below."
      />

      <UAlert
        v-if="referralCode && !sent"
        icon="i-lucide-gift"
        color="success"
        variant="subtle"
        class="mb-4"
        :title="`Referral applied: ${referralCode}`"
        description="Your discount will apply at checkout."
      />

      <form v-if="!sent" class="flex flex-col gap-4" @submit.prevent="submit">
        <UFormField label="Email" required class="w-full">
          <UInput
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="you@example.com"
            class="w-full"
          />
        </UFormField>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <UButton type="submit" :loading="loading" block> Email me a sign-in link </UButton>
      </form>

      <div v-else class="flex flex-col gap-4">
        <p class="text-sm text-gray-600">
          Didn't get it? Check spam, or
          <button type="button" class="font-medium underline" @click="reset">try a different email</button>.
        </p>
      </div>
    </UCard>
  </div>
</template>
