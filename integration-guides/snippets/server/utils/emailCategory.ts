import type { EmailId } from '../emails'

export type EmailCategory = 'transactional' | 'product' | 'marketing'

/**
 * Single source of truth: what category each templated email belongs to.
 * The scheduler/runner uses this to decide whether to honour the recipient's
 * per-category preference. Transactional always sends past suppression.
 *
 *   transactional  — login links, receipts, cancellation confirmations
 *   product        — onboarding, in-product nudges (gated by productEnabled)
 *   marketing      — newsletter, win-backs, marketing drip (gated by marketingEnabled)
 *
 * A login link MUST be transactional. If you categorise magic-link as
 * marketing, an unsubscribed user can't sign in.
 */
export const EMAIL_CATEGORY: Record<EmailId, EmailCategory> = {
  'magic-link': 'transactional',
  'system-test': 'transactional',
  welcome: 'product'
  // Add new templates here as you register them in server/emails/index.ts.
}
