CREATE TABLE "customer_service_coverage" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_service_coverage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_service_coverage_staffUserId_customerId_key" ON "customer_service_coverage"("staffUserId", "customerId");
CREATE INDEX "customer_service_coverage_customerId_idx" ON "customer_service_coverage"("customerId");
ALTER TABLE "customer_service_coverage" ADD CONSTRAINT "customer_service_coverage_staffUserId_fkey"
  FOREIGN KEY ("staffUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_service_coverage" ADD CONSTRAINT "customer_service_coverage_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_service_coverage" ADD CONSTRAINT "customer_service_coverage_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
