ALTER TABLE "expenses"
  ADD COLUMN "attachmentData" BYTEA,
  ADD COLUMN "attachmentMimeType" TEXT,
  ADD COLUMN "attachmentFileName" TEXT;

ALTER TABLE "payments"
  ADD COLUMN "paymentType" TEXT NOT NULL DEFAULT 'DeliveryFee',
  ADD COLUMN "receiptData" BYTEA,
  ADD COLUMN "receiptMimeType" TEXT,
  ADD COLUMN "receiptFileName" TEXT;

ALTER TABLE "customer_pickup_locations"
  ADD COLUMN "instructions" TEXT;
