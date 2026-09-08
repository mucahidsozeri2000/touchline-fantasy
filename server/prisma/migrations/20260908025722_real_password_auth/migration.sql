-- Accounts used to be created by name alone, so any two people who typed the
-- same team and coach shared one login. Passwords become mandatory here.
--
-- Rows that predate this migration get a placeholder that no password can ever
-- hash to: verifyPassword() only accepts "scrypt$<salt>$<key>", so "!" fails
-- the format check and those accounts simply cannot sign in until they are
-- registered again. Failing closed is the point — do not swap this for a
-- default that some password could match.
ALTER TABLE "Manager" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '!';
ALTER TABLE "Manager" ALTER COLUMN "passwordHash" DROP DEFAULT;

-- Email is the login identifier now, so it can no longer be null. Any row
-- without one gets a unique, unusable address for the same reason.
UPDATE "Manager"
   SET "email" = 'disabled+' || "id" || '@invalid.touchline'
 WHERE "email" IS NULL;

ALTER TABLE "Manager" ALTER COLUMN "email" SET NOT NULL;
