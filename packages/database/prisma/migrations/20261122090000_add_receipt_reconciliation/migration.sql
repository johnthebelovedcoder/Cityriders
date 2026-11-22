-- AlterTable
ALTER TABLE "packages" ADD COLUMN "receiptReconciled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "packages" ADD COLUMN "receiptReconciledAt" TIMESTAMP(3);
