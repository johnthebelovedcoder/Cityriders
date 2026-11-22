-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PackageStatus" ADD VALUE 'PENDING';
ALTER TYPE "PackageStatus" ADD VALUE 'COLLECTED';
ALTER TYPE "PackageStatus" ADD VALUE 'RECEIVED_AT_OFFICE';
ALTER TYPE "PackageStatus" ADD VALUE 'SORTED';
ALTER TYPE "PackageStatus" ADD VALUE 'DISPATCHED';
ALTER TYPE "PackageStatus" ADD VALUE 'OUT_FOR_DELIVERY';
ALTER TYPE "PackageStatus" ADD VALUE 'FAILED';
ALTER TYPE "PackageStatus" ADD VALUE 'RESCHEDULED';
ALTER TYPE "PackageStatus" ADD VALUE 'ON_HOLD';

-- AlterTable
ALTER TABLE "package_status_events" ADD COLUMN     "failureReasonCodeId" TEXT,
ADD COLUMN     "reattemptAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "manifestId" TEXT,
ADD COLUMN     "reattemptAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "failure_reason_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "failure_reason_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_manifests" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_manifests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "failure_reason_codes_code_key" ON "failure_reason_codes"("code");

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "dispatch_manifests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_status_events" ADD CONSTRAINT "package_status_events_failureReasonCodeId_fkey" FOREIGN KEY ("failureReasonCodeId") REFERENCES "failure_reason_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_manifests" ADD CONSTRAINT "dispatch_manifests_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_manifests" ADD CONSTRAINT "dispatch_manifests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
