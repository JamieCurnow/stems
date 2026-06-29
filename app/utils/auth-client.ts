import { createAuthClient } from 'better-auth/vue'
import { magicLinkClient, emailOTPClient } from 'better-auth/client/plugins'
import { stripeClient } from '@better-auth/stripe/client'

/**
 * Better Auth Vue client. Same-origin: Better Auth resolves to /api/auth/*
 * by default. If you ever host the API on a different domain, set `baseURL`
 * here.
 *
 * Drop the `stripeClient` plugin if you don't need billing.
 */
export const authClient = createAuthClient({
  plugins: [magicLinkClient(), emailOTPClient(), stripeClient({ subscription: true })]
})

// `signUp` is intentionally not re-exported — password auth is disabled and
// account creation now happens implicitly on first OTP / magic-link verify.
export const { signIn, signOut, useSession } = authClient
