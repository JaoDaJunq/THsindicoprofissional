
-- CreateEnum
CREATE TYPE "CondominiumRole" AS ENUM ('RESIDENT', 'MANAGER');

-- AlterTable
ALTER TABLE "Condominium" DROP COLUMN "residentsCount";

-- CreateTable
CREATE TABLE "CondominiumMember" (
    "id" UUID NOT NULL,
    "condominiumId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "CondominiumRole" NOT NULL DEFAULT 'RESIDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CondominiumMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CondominiumMember_deletedAt_idx" ON "CondominiumMember"("deletedAt");

-- CreateIndex
CREATE INDEX "CondominiumMember_condominiumId_idx" ON "CondominiumMember"("condominiumId");

-- CreateIndex
CREATE INDEX "CondominiumMember_userId_idx" ON "CondominiumMember"("userId");

-- AddForeignKey
ALTER TABLE "CondominiumMember" ADD CONSTRAINT "CondominiumMember_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CondominiumMember" ADD CONSTRAINT "CondominiumMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A plain unique index would keep an unlinked person from being linked again.
-- See `.claude/rules/soft-delete.md`.
CREATE UNIQUE INDEX "CondominiumMember_active_key"
  ON "CondominiumMember" ("condominiumId", "userId") WHERE "deletedAt" IS NULL;
