import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * Drizzle schema for the Cloudflare D1 database.
 *
 * The auth tables (user, session, account, verification) are owned by Better
 * Auth — its CLI generates and updates the DDL. They're declared here so
 * Drizzle can resolve foreign keys and (if useful later) read from them.
 * Keep these in lock-step with 0001_better_auth.sql.
 *
 * Date columns on Better-Auth-managed tables (user, subscription) are typed
 * `text`, NOT `integer({ mode: 'timestamp_ms' })`. On SQLite/D1 Better Auth's
 * adapter runs with `supportsDates: false`, so it serialises every Date to an
 * ISO 8601 string (`.toISOString()`) and stores it in the `date`-affinity
 * column. Declaring those as `text` matches what's actually on disk; the
 * client (`useSubscription.ts`) already consumes them as `string`. Don't write
 * to these columns via Drizzle — Better Auth owns them.
 *
 * App-owned tables (referral, email-related) ARE written via Drizzle, so their
 * Date columns stay `integer({ mode: 'timestamp_ms' })` (epoch millis).
 * Managed by hand-rolled SQL migrations in server/db/migrations/.
 *
 * Trim tables you don't need:
 *   - No Stripe?  Drop `subscription`, `referral`, `referralRedemption`.
 *   - No emails?  Drop `emailPreferences`, `emailSuppression`, `lead`, `scheduledEmail`.
 */

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull(),
  image: text('image'),
  // ISO 8601 strings — written by Better Auth (supportsDates: false on SQLite).
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
  // Added by Better Auth Stripe plugin via 0003_stripe.sql migration
  stripeCustomerId: text('stripeCustomerId'),
  // Optional: referral code the user signed up with (captured at signup
  // from the cookie set by /r/[code])
  referredByCode: text('referredByCode')
})

/* Owned by the @better-auth/stripe plugin — see 0003_stripe.sql. */
export const subscription = sqliteTable(
  'subscription',
  {
    id: text('id').primaryKey(),
    plan: text('plan').notNull(),
    referenceId: text('referenceId').notNull(),
    stripeCustomerId: text('stripeCustomerId'),
    stripeSubscriptionId: text('stripeSubscriptionId'),
    status: text('status').notNull(),
    // ISO 8601 strings — written by the @better-auth/stripe plugin via Better
    // Auth's adapter (supportsDates: false on SQLite). See the file header.
    periodStart: text('periodStart'),
    periodEnd: text('periodEnd'),
    trialStart: text('trialStart'),
    trialEnd: text('trialEnd'),
    cancelAtPeriodEnd: integer('cancelAtPeriodEnd', { mode: 'boolean' }),
    cancelAt: text('cancelAt'),
    canceledAt: text('canceledAt'),
    endedAt: text('endedAt'),
    seats: integer('seats'),
    billingInterval: text('billingInterval'),
    stripeScheduleId: text('stripeScheduleId')
  },
  (t) => [
    index('subscription_referenceId_idx').on(t.referenceId),
    index('subscription_stripeSubscriptionId_idx').on(t.stripeSubscriptionId)
  ]
)

/* Referral system — optional. Drop with the referral migration if unused. */
export const referral = sqliteTable(
  'referral',
  {
    id: text('id').primaryKey(),
    referrerId: text('referrerId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    code: text('code').notNull().unique(),
    stripePromotionCodeId: text('stripePromotionCodeId').notNull(),
    rewardMonthsGranted: integer('rewardMonthsGranted').notNull().default(0),
    createdAt: integer('createdAt').notNull()
  },
  (t) => [index('referral_referrerId_idx').on(t.referrerId)]
)

export const referralRedemption = sqliteTable(
  'referralRedemption',
  {
    id: text('id').primaryKey(),
    referralId: text('referralId')
      .notNull()
      .references(() => referral.id, { onDelete: 'cascade' }),
    refereeUserId: text('refereeUserId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    refereeStripeSubscriptionId: text('refereeStripeSubscriptionId').notNull(),
    rewardGrantedAt: integer('rewardGrantedAt'),
    createdAt: integer('createdAt').notNull()
  },
  (t) => [uniqueIndex('referralRedemption_refereeUserId_idx').on(t.refereeUserId)]
)

/* Email plumbing — preferences + suppression + leads + scheduled queue. */
export const emailPreferences = sqliteTable('emailPreferences', {
  userId: text('userId')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  marketingEnabled: integer('marketingEnabled', { mode: 'boolean' }).notNull().default(true),
  productEnabled: integer('productEnabled', { mode: 'boolean' }).notNull().default(true),
  transactionalEnabled: integer('transactionalEnabled', { mode: 'boolean' }).notNull().default(true),
  unsubscribeToken: text('unsubscribeToken').notNull().unique(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull()
})

export const emailSuppression = sqliteTable('emailSuppression', {
  email: text('email').primaryKey(),
  reason: text('reason').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull()
})

/* Optional: lead capture (anonymous email collection before signup). */
export const lead = sqliteTable(
  'lead',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    source: text('source'),
    convertedAt: integer('convertedAt', { mode: 'timestamp_ms' }),
    unsubscribeToken: text('unsubscribeToken').notNull().unique(),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull()
  },
  (t) => [index('lead_email_idx').on(t.email)]
)

/* D1-backed scheduled email mirror. The Durable Object is the source of
   truth; this row exists for admin inspection + prefix-based cancellation. */
export const scheduledEmail = sqliteTable(
  'scheduledEmail',
  {
    id: text('id').primaryKey(),
    dedupeKey: text('dedupeKey').unique(),
    emailId: text('emailId').notNull(),
    /* At least one of userId / leadId should be set */
    userId: text('userId').references(() => user.id, { onDelete: 'cascade' }),
    leadId: text('leadId').references(() => lead.id, { onDelete: 'cascade' }),
    /* JSON-encoded props handed to the template at render time */
    props: text('props').notNull().default('{}'),
    sendAt: integer('sendAt', { mode: 'timestamp_ms' }).notNull(),
    status: text('status').notNull().default('scheduled'),
    /* When status moves out of 'scheduled' */
    settledAt: integer('settledAt', { mode: 'timestamp_ms' }),
    /* Free-text note set by the runner — error message or skip reason */
    note: text('note'),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull()
  },
  (t) => [
    index('scheduledEmail_status_sendAt_idx').on(t.status, t.sendAt),
    index('scheduledEmail_userId_idx').on(t.userId),
    index('scheduledEmail_leadId_idx').on(t.leadId)
  ]
)

export type SubscriptionRow = typeof subscription.$inferSelect
export type ReferralRow = typeof referral.$inferSelect
export type ReferralRedemptionRow = typeof referralRedemption.$inferSelect
export type EmailPreferencesRow = typeof emailPreferences.$inferSelect
export type EmailSuppressionRow = typeof emailSuppression.$inferSelect
export type LeadRow = typeof lead.$inferSelect
export type ScheduledEmailRow = typeof scheduledEmail.$inferSelect
