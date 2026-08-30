-- AlterTable
ALTER TABLE "User" ALTER COLUMN "mustChangePassword" SET DEFAULT false;

-- Anyone who never received a password (Google sign-in) must not be sent to the
-- password change screen.
UPDATE "User" SET "mustChangePassword" = false WHERE "passwordHash" IS NULL;
