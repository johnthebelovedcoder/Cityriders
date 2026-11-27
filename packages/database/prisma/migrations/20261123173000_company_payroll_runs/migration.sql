CREATE TABLE "company_payroll_runs" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "deliveries" INTEGER NOT NULL DEFAULT 0,
  "basicPay" DECIMAL(12,2) NOT NULL,
  "housingAllowance" DECIMAL(12,2) NOT NULL,
  "transportAllowance" DECIMAL(12,2) NOT NULL,
  "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "additions" JSONB NOT NULL DEFAULT '[]',
  "additionsTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "grossPay" DECIMAL(12,2) NOT NULL,
  "taxPAYE" DECIMAL(12,2) NOT NULL,
  "pension" DECIMAL(12,2) NOT NULL,
  "nhf" DECIMAL(12,2) NOT NULL,
  "netPay" DECIMAL(12,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "company_payroll_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_payroll_runs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "company_payroll_runs_employee_period_key" UNIQUE ("employeeId", "period")
);

CREATE INDEX "company_payroll_runs_period_idx" ON "company_payroll_runs"("period");
