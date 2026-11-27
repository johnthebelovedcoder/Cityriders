ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'TYRES';
ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'SERVICING';
ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'PARTS';
ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'TOLL_PARKING';

ALTER TABLE "users" ADD COLUMN "customerId" TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "users_customerId_idx" ON "users"("customerId");

ALTER TABLE "customers" ADD COLUMN "contactPerson" TEXT;
ALTER TABLE "customers" ADD COLUMN "billingAddress" TEXT;

ALTER TABLE "riders" ADD COLUMN "emergencyContact" TEXT;
ALTER TABLE "riders" ADD COLUMN "dateJoined" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "zones" ADD COLUMN "description" TEXT;
ALTER TABLE "zones" ADD COLUMN "coverageAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "zones" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "system_settings" ADD COLUMN "maxPackagesPerRider" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "system_settings" ADD COLUMN "maintenanceReviewDays" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "maintenance_records" ADD COLUMN "component" TEXT;
ALTER TABLE "maintenance_records" ADD COLUMN "replacementDate" TIMESTAMP(3);

ALTER TABLE "expenses" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'Approved';
ALTER TABLE "expenses" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "expenses" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "expenses" ADD COLUMN "approvalNote" TEXT;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "expense_category_options" (
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "expense_category_options_pkey" PRIMARY KEY ("code")
);
INSERT INTO "expense_category_options" ("code", "label", "updatedAt") VALUES
  ('FUEL', 'Fuel', CURRENT_TIMESTAMP), ('MAINTENANCE', 'Vehicle Maintenance / Repairs', CURRENT_TIMESTAMP),
  ('TYRES', 'Tyres', CURRENT_TIMESTAMP), ('SERVICING', 'Servicing', CURRENT_TIMESTAMP),
  ('PARTS', 'Parts', CURRENT_TIMESTAMP), ('TOLL_PARKING', 'Toll / Parking', CURRENT_TIMESTAMP),
  ('RIDER_COMPENSATION', 'Rider Compensation', CURRENT_TIMESTAMP), ('OFFICE', 'Office', CURRENT_TIMESTAMP),
  ('MARKETING', 'Marketing', CURRENT_TIMESTAMP), ('OTHER', 'Other', CURRENT_TIMESTAMP);

CREATE TABLE "customer_account_adjustments" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_account_adjustments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "customer_account_adjustments_customerId_effectiveAt_idx" ON "customer_account_adjustments"("customerId", "effectiveAt");
ALTER TABLE "customer_account_adjustments" ADD CONSTRAINT "customer_account_adjustments_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_account_adjustments" ADD CONSTRAINT "customer_account_adjustments_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "system_settings" ADD COLUMN "bankName" TEXT;
ALTER TABLE "system_settings" ADD COLUMN "accountNumber" TEXT;
ALTER TABLE "system_settings" ADD COLUMN "accountName" TEXT;
ALTER TABLE "system_settings" ADD COLUMN "invoicePaymentTermsDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "system_settings" ADD COLUMN "invoiceFooterNote" TEXT;

ALTER TABLE "customer_orders" ADD COLUMN "pickupLocationId" TEXT;
ALTER TABLE "customer_orders" ADD COLUMN "collectedAt" TIMESTAMP(3);
ALTER TABLE "customer_orders" ADD COLUMN "collectedById" TEXT;
ALTER TABLE "customer_orders" ADD COLUMN "officeReceivedAt" TIMESTAMP(3);
ALTER TABLE "customer_orders" ADD COLUMN "officeReceivedById" TEXT;
ALTER TABLE "customer_orders" ADD COLUMN "serviceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_pickupLocationId_fkey"
  FOREIGN KEY ("pickupLocationId") REFERENCES "customer_pickup_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_collectedById_fkey"
  FOREIGN KEY ("collectedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_officeReceivedById_fkey"
  FOREIGN KEY ("officeReceivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dispatch_manifests" ADD COLUMN "serviceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "delivery_outcome_corrections" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "correctedById" TEXT NOT NULL,
  "previousStatus" "PackageStatus" NOT NULL,
  "correctedStatus" "PackageStatus" NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_outcome_corrections_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "delivery_outcome_corrections_packageId_createdAt_idx" ON "delivery_outcome_corrections"("packageId", "createdAt");
ALTER TABLE "delivery_outcome_corrections" ADD CONSTRAINT "delivery_outcome_corrections_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_outcome_corrections" ADD CONSTRAINT "delivery_outcome_corrections_correctedById_fkey"
  FOREIGN KEY ("correctedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
