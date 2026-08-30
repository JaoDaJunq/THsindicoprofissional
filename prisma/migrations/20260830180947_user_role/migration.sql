-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'RESIDENT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'RESIDENT';

-- Convert before dropping: the boolean is the only record of who managed what.
UPDATE "User" SET "role" = 'MANAGER' WHERE "isManager";
UPDATE "User" SET "role" = 'ADMIN' WHERE "username" = 'admin';

ALTER TABLE "User" DROP COLUMN "isManager";
