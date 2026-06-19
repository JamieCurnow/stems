import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core'

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

/* ── Stems app tables ─────────────────────────────────────────────────────
   Profiles + flower listings. App-owned (written via Drizzle), keyed by Better
   Auth's user.id. Date columns are epoch millis; money is integer pence. See
   roadmap/02-data-model.md for the canonical spec. */

/* Profile (1:1 with user). Holds everything that makes a grower's public page.
   Florist-specific fields are deferred to V2. */
export const profile = sqliteTable(
  'profile',
  {
    userId: text('userId')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    handle: text('handle').notNull().unique(), // lowercase canonical, no '@'
    farmName: text('farmName').notNull(), // display name / farm name
    bio: text('bio'), // about-page body (plain text/markdown-lite)
    locationName: text('locationName'), // freeform e.g. "Bissoe, Cornwall"
    postcode: text('postcode'), // stored for future radius search (V2)
    latitude: real('latitude'), // optional geocode (V2 search); nullable in V1
    longitude: real('longitude'),
    instagram: text('instagram'), // handle without '@'
    website: text('website'),
    // Contact-the-grower deep links (no in-app messaging — see shared/utils/contact.ts).
    whatsapp: text('whatsapp'), // contact number, international format (powers wa.me)
    contactEmail: text('contactEmail'), // public contact email, distinct from login email
    preferredContact: text('preferredContact'), // 'whatsapp' | 'email' | 'instagram' | null
    avatarKey: text('avatarKey'), // R2 key (see doc 06)
    bannerKey: text('bannerKey'), // R2 key, optional hero image
    isGrower: integer('isGrower', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull()
  },
  (t) => [uniqueIndex('profile_handle_idx').on(t.handle), index('profile_isGrower_idx').on(t.isGrower)]
)

/* Flower listing (1:N from grower). The live, continuously-editable
   availability item. No weekly snapshot. `updatedAt` powers the public
   "Updated 2 days ago" line. */
export const flower = sqliteTable(
  'flower',
  {
    id: text('id').primaryKey(),
    growerId: text('growerId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // "Cosmos"
    variety: text('variety'), // "Cupcake White"
    color: text('color'), // freeform "White", "Blush pink"
    stemLengthCm: integer('stemLengthCm'), // 60
    stemsPerBunch: integer('stemsPerBunch'), // 10
    pricePerStem: integer('pricePerStem'), // pence, e.g. 85 = £0.85
    pricePerBunch: integer('pricePerBunch'), // pence; optional override, else derived
    // Grower will consider offers rather than only the listed price.
    openToOffers: integer('openToOffers', { mode: 'boolean' }).notNull().default(false),
    // Categorical availability hint the grower picks from a fixed list (see
    // AVAILABILITY_STATUS_VALUES in shared/utils/flowers.ts). null = none. Set
    // independently of `stemsAvailable` — a grower may use either or both.
    availabilityStatus: text('availabilityStatus'),
    // Stems currently available: null = available (count unspecified), 0 = sold
    // out, >0 = that many stems.
    stemsAvailable: integer('stemsAvailable'),
    notes: text('notes'),
    sortOrder: integer('sortOrder').notNull().default(0),
    isArchived: integer('isArchived', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull()
  },
  (t) => [
    index('flower_growerId_idx').on(t.growerId),
    index('flower_grower_archived_idx').on(t.growerId, t.isArchived)
  ]
)

/* Flower photos (1:N). Square crops stored in public R2 (doc 06). V1 UI manages
   one primary photo (lowest sortOrder), but the table supports a gallery for V2
   with no migration. */
export const flowerPhoto = sqliteTable(
  'flower_photo',
  {
    id: text('id').primaryKey(),
    flowerId: text('flowerId')
      .notNull()
      .references(() => flower.id, { onDelete: 'cascade' }),
    r2Key: text('r2Key').notNull(),
    sortOrder: integer('sortOrder').notNull().default(0),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull()
  },
  (t) => [index('flower_photo_flowerId_idx').on(t.flowerId)]
)

export type ProfileRow = typeof profile.$inferSelect
export type FlowerRow = typeof flower.$inferSelect
export type FlowerPhotoRow = typeof flowerPhoto.$inferSelect

export type SubscriptionRow = typeof subscription.$inferSelect
export type ReferralRow = typeof referral.$inferSelect
export type ReferralRedemptionRow = typeof referralRedemption.$inferSelect
export type EmailPreferencesRow = typeof emailPreferences.$inferSelect
export type EmailSuppressionRow = typeof emailSuppression.$inferSelect
export type LeadRow = typeof lead.$inferSelect
export type ScheduledEmailRow = typeof scheduledEmail.$inferSelect
