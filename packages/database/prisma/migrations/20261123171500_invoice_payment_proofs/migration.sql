CREATE TABLE "invoice_payment_proofs" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileData" BYTEA NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_payment_proofs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_payment_proofs_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "invoice_payment_proofs_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "invoice_payment_proofs_invoiceId_idx" ON "invoice_payment_proofs"("invoiceId");
