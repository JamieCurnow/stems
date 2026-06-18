-- Email plumbing. Drop tables you don't need:
--   - No leads?               drop `lead`, lead_email_idx
--   - No scheduling?          drop `scheduledEmail` + its indexes
--   - No preferences at all?  drop `emailPreferences`, `emailSuppression`
--     (but you'll need them for compliance — keep them)

CREATE TABLE "emailPreferences" (
  "userId" text NOT NULL PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  "marketingEnabled" integer NOT NULL DEFAULT 1,
  "productEnabled" integer NOT NULL DEFAULT 1,
  "transactionalEnabled" integer NOT NULL DEFAULT 1,
  "unsubscribeToken" text NOT NULL UNIQUE,
  "updatedAt" integer NOT NULL
);

CREATE TABLE "emailSuppression" (
  "email" text NOT NULL PRIMARY KEY,
  "reason" text NOT NULL,
  "createdAt" integer NOT NULL
);

CREATE TABLE "lead" (
  "id" text NOT NULL PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "source" text,
  "convertedAt" integer,
  "unsubscribeToken" text NOT NULL UNIQUE,
  "createdAt" integer NOT NULL
);

CREATE INDEX "lead_email_idx" ON "lead" ("email");

CREATE TABLE "scheduledEmail" (
  "id" text NOT NULL PRIMARY KEY,
  "dedupeKey" text UNIQUE,
  "emailId" text NOT NULL,
  "userId" text REFERENCES "user"("id") ON DELETE CASCADE,
  "leadId" text REFERENCES "lead"("id") ON DELETE CASCADE,
  "props" text NOT NULL DEFAULT '{}',
  "sendAt" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'scheduled',
  "settledAt" integer,
  "note" text,
  "createdAt" integer NOT NULL
);

CREATE INDEX "scheduledEmail_status_sendAt_idx" ON "scheduledEmail" ("status", "sendAt");
CREATE INDEX "scheduledEmail_userId_idx" ON "scheduledEmail" ("userId");
CREATE INDEX "scheduledEmail_leadId_idx" ON "scheduledEmail" ("leadId");
