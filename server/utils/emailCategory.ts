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
  'email-otp': 'transactional',
  'system-test': 'transactional',
  welcome: 'product',
  invoice: 'transactional'
  // Add new templates here as you register them in server/emails/index.ts.
}

/**
 * "External" emails go to people who aren't a Stems audience member — e.g. an
 * invoice sent to a grower's customer. They MUST NOT carry the Stems
 * unsubscribe footer / List-Unsubscribe header: that footer links to Stems
 * account preferences the recipient can't use, and an "unsubscribe" click would
 * suppress an address that isn't theirs to manage. The send layer skips the
 * unsubscribe chrome for these.
 */
export const EXTERNAL_EMAIL_IDS = new Set<EmailId>(['invoice'])

export const isExternalEmail = (id: EmailId): boolean => EXTERNAL_EMAIL_IDS.has(id)
