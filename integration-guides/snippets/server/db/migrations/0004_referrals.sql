-- Referral system. Optional — drop if not using.
--
-- The unique index on referralRedemption.refereeUserId enforces idempotency
-- for the reward grant (see server/utils/referrals.ts).

CREATE TABLE "referral" (
  "id" text NOT NULL PRIMARY KEY,
  "referrerId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "code" text NOT NULL UNIQUE,
  "stripePromotionCodeId" text NOT NULL,
  "rewardMonthsGranted" integer NOT NULL DEFAULT 0,
  "createdAt" integer NOT NULL
);

CREATE INDEX "referral_referrerId_idx" ON "referral" ("referrerId");

CREATE TABLE "referralRedemption" (
  "id" text NOT NULL PRIMARY KEY,
  "referralId" text NOT NULL REFERENCES "referral"("id") ON DELETE CASCADE,
  "refereeUserId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "refereeStripeSubscriptionId" text NOT NULL,
  "rewardGrantedAt" integer,
  "createdAt" integer NOT NULL
);

CREATE UNIQUE INDEX "referralRedemption_refereeUserId_idx" ON "referralRedemption" ("refereeUserId");

-- Captured at signup time from the referral cookie (if present), populated
-- by the Better Auth databaseHooks.user.create.before hook in
-- server/utils/auth.ts. NULL for users who signed up without a referral.
ALTER TABLE "user" ADD COLUMN "referredByCode" TEXT;
CREATE INDEX "user_referredByCode_idx" ON "user" ("referredByCode");
