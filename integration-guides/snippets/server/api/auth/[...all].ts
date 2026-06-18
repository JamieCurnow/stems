// Catch-all handler that forwards every request under /api/auth/* to
// Better Auth. This is what powers /api/auth/sign-in/magic-link,
// /api/auth/magic-link/verify, /api/auth/get-session, and (when the Stripe
// plugin is on) /api/auth/stripe/webhook, /api/auth/subscription/upgrade,
// etc.
export default defineEventHandler((event) => {
  const auth = serverAuth(event)
  return auth.handler(toWebRequest(event))
})
