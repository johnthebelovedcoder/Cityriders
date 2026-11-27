CREATE TYPE "CustomerOrderStatus" AS ENUM ('RECEIVING', 'RECONCILED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "customer_orders" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerReference" TEXT NOT NULL,
    "expectedPackageCount" INTEGER,
    "receivedPackageCount" INTEGER NOT NULL DEFAULT 0,
    "status" "CustomerOrderStatus" NOT NULL DEFAULT 'RECEIVING',
    "discrepancyNote" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "packages" ADD COLUMN "customerOrderId" TEXT;
CREATE UNIQUE INDEX "customer_orders_customerId_customerReference_key" ON "customer_orders"("customerId", "customerReference");
CREATE INDEX "customer_orders_status_idx" ON "customer_orders"("status");
CREATE INDEX "customer_orders_createdAt_idx" ON "customer_orders"("createdAt");
CREATE INDEX "packages_customerOrderId_idx" ON "packages"("customerOrderId");
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "packages" ADD CONSTRAINT "packages_customerOrderId_fkey"
  FOREIGN KEY ("customerOrderId") REFERENCES "customer_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
