import type {
  D1Database,
  DurableObjectNamespace,
  ExecutionContext
  // R2Bucket  ← add back to this import when you enable the FILES binding below
} from '@cloudflare/workers-types'

/**
 * Bindings exposed by the Cloudflare Worker runtime.
 *
 * Update this file whenever you add a binding or wrangler secret. Without
 * the corresponding field here, `event.context.cloudflare.env.X` is `any`.
 */
export interface CloudflareEnv {
  DB: D1Database
  // FILES: R2Bucket                                 // uncomment if using R2

  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string

  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_REFERRAL_WEBHOOK_SECRET: string             // optional, only if /api/stripe/webhook lives separately
  STRIPE_PRICE_ID: string
  STRIPE_REFERRAL_COUPON_ID?: string                 // optional, only with referrals

  RESEND_API_KEY: string
  MAIL_FROM: string
  PUBLIC_BASE_URL: string
  RESEND_WEBHOOK_SECRET?: string

  ADMIN_API_SECRET: string
  ADMIN_EMAILS?: string                              // comma-separated extras

  // Analytics — all optional; sendServerEvent is a no-op when unset
  NUXT_PUBLIC_GTM_ID?: string
  NUXT_PUBLIC_GA4_MEASUREMENT_ID?: string
  GA4_API_SECRET?: string

  EMAIL_SCHEDULER: DurableObjectNamespace
}

declare module 'h3' {
  interface H3EventContext {
    cloudflare: {
      env: CloudflareEnv
      context: ExecutionContext
      request: Request
    }
    cf: IncomingRequestCfProperties | undefined
    waitUntil: (promise: Promise<unknown>) => void
  }
}

export {}
