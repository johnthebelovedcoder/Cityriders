CREATE TABLE "delivery_attempts" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "outcome" "PackageStatus" NOT NULL,
    "reason" "FailedDeliveryReason",
    "failureReasonCodeId" TEXT,
    "note" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_attempts_packageId_attemptedAt_idx" ON "delivery_attempts"("packageId", "attemptedAt");
CREATE INDEX "delivery_attempts_riderId_attemptedAt_idx" ON "delivery_attempts"("riderId", "attemptedAt");

ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_riderId_fkey"
  FOREIGN KEY ("riderId") REFERENCES "riders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_failureReasonCodeId_fkey"
  FOREIGN KEY ("failureReasonCodeId") REFERENCES "failure_reason_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
