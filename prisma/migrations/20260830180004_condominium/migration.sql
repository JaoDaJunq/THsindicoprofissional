-- CreateTable
CREATE TABLE "Condominium" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "cnpj" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "unitsCount" INTEGER NOT NULL DEFAULT 0,
    "blocksCount" INTEGER NOT NULL DEFAULT 0,
    "residentsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Condominium_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Condominium_deletedAt_idx" ON "Condominium"("deletedAt");

-- A plain unique index would let an excluded condominium block a new one with
-- the same CNPJ. See `.claude/rules/soft-delete.md`.
CREATE UNIQUE INDEX "Condominium_cnpj_active_key"
  ON "Condominium" ("cnpj") WHERE "deletedAt" IS NULL;
