/*
  Warnings:

  - Added the required column `email` to the `password_reset_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BillingCycle" ADD VALUE 'DAILY';
ALTER TYPE "BillingCycle" ADD VALUE 'BI_WEEKLY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvoiceStatus" ADD VALUE 'VOID';
ALTER TYPE "InvoiceStatus" ADD VALUE 'DISPUTED';

-- AlterTable
ALTER TABLE "dispatch_manifests" ADD COLUMN     "actualPackageCount" INTEGER,
ADD COLUMN     "expectedPackageCount" INTEGER;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "paymentMethod" "PaymentMethod";

-- AlterTable
ALTER TABLE "password_reset_tokens" ADD COLUMN     "email" TEXT NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "maxActiveAssignments" INTEGER NOT NULL DEFAULT 5;
