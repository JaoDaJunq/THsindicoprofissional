-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "username" TEXT;

-- username único apenas entre os ativos, como o e-mail
CREATE UNIQUE INDEX "User_username_active_key" ON "User"("username") WHERE "deletedAt" IS NULL;
