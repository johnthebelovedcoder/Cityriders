import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'node:crypto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { dateFrom?: string; dateTo?: string; from?: string; to?: string; page?: number; limit?: number; search?: string; type?: string; status?: string; method?: string } = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const from = query.from ?? query.dateFrom;
    const to = query.to ?? query.dateTo;
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(`${to}T23:59:59.999`) : null;
    const statusCode = ({ Paid: 'COMPLETED', Pending: 'PENDING', Refunded: 'REFUNDED', Failed: 'CANCELLED' } as Record<string, string>)[query.status ?? ''] ?? query.status ?? null;
    const methodCode = ({ Cash: 'CASH', BankTransfer: 'BANK_TRANSFER', Card: 'ONLINE', Credit: 'OTHER' } as Record<string, string>)[query.method ?? ''] ?? query.method ?? null;
    const search = query.search?.trim() || null;
    const [rows, aggregates] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT p."id", p."amount", p."currency", p."method"::text AS "method", p."status"::text AS "status", p."reference", p."notes", p."packageId", p."customerId", p."paymentDate", p."createdAt", p."paymentType" AS "type", (p."receiptData" IS NOT NULL) AS "hasReceipt",
          CASE WHEN pkg."id" IS NULL THEN NULL ELSE jsonb_build_object('id', pkg."id", 'trackingNumber', pkg."trackingNumber") END AS "package",
          CASE WHEN c."id" IS NULL THEN NULL ELSE jsonb_build_object('id', c."id", 'name', c."name") END AS "customer"
        FROM "payments" p LEFT JOIN "packages" pkg ON pkg."id" = p."packageId" LEFT JOIN "customers" c ON c."id" = p."customerId"
        WHERE (${fromDate}::timestamp IS NULL OR p."paymentDate" >= ${fromDate}::timestamp)
          AND (${toDate}::timestamp IS NULL OR p."paymentDate" <= ${toDate}::timestamp)
          AND (${query.type ?? null}::text IS NULL OR p."paymentType" = ${query.type ?? null})
          AND (${statusCode}::text IS NULL OR p."status"::text = ${statusCode})
          AND (${methodCode}::text IS NULL OR p."method"::text = ${methodCode})
          AND (${search}::text IS NULL OR p."reference" ILIKE '%' || ${search} || '%' OR pkg."trackingNumber" ILIKE '%' || ${search} || '%' OR c."name" ILIKE '%' || ${search} || '%')
        ORDER BY p."paymentDate" DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int AS "total",
          COALESCE(SUM(p."amount") FILTER (WHERE p."status" = 'COMPLETED'), 0) AS "totalCollected",
          COALESCE(SUM(p."amount") FILTER (WHERE p."status" = 'PENDING'), 0) AS "totalPending",
          COALESCE(SUM(p."amount") FILTER (WHERE p."paymentType" = 'RiderRemittance' AND p."status" = 'COMPLETED'), 0) AS "totalRemitted"
        FROM "payments" p LEFT JOIN "packages" pkg ON pkg."id" = p."packageId" LEFT JOIN "customers" c ON c."id" = p."customerId"
        WHERE (${fromDate}::timestamp IS NULL OR p."paymentDate" >= ${fromDate}::timestamp)
          AND (${toDate}::timestamp IS NULL OR p."paymentDate" <= ${toDate}::timestamp)
          AND (${query.type ?? null}::text IS NULL OR p."paymentType" = ${query.type ?? null})
          AND (${statusCode}::text IS NULL OR p."status"::text = ${statusCode})
          AND (${methodCode}::text IS NULL OR p."method"::text = ${methodCode})
          AND (${search}::text IS NULL OR p."reference" ILIKE '%' || ${search} || '%' OR pkg."trackingNumber" ILIKE '%' || ${search} || '%' OR c."name" ILIKE '%' || ${search} || '%')`,
    ]);
    const summary = aggregates[0] ?? { total: 0, totalCollected: 0, totalPending: 0, totalRemitted: 0 };
    const statusLabels: Record<string, string> = { COMPLETED: 'Paid', PENDING: 'Pending', REFUNDED: 'Refunded', CANCELLED: 'Failed' };
    const data = rows.map((payment) => ({ ...payment, status: statusLabels[payment.status] ?? payment.status }));
    const total = Number(summary.total ?? 0);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) }, summary: { totalCollected: Number(summary.totalCollected), totalPending: Number(summary.totalPending), totalRemitted: Number(summary.totalRemitted) } };
  }

  async create(dto: any, recordedById: string, receipt?: Express.Multer.File) {
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Payment amount must be greater than zero');
    const methods: Record<string, string> = { Cash: 'CASH', BankTransfer: 'BANK_TRANSFER', Card: 'ONLINE', Credit: 'OTHER', CASH: 'CASH', BANK_TRANSFER: 'BANK_TRANSFER', POS: 'POS', ONLINE: 'ONLINE', OTHER: 'OTHER' };
    const method = methods[dto.method];
    if (!method) throw new BadRequestException('Select a valid payment method');
    const types = ['DeliveryFee', 'Credit', 'RiderRemittance', 'Refund'];
    const paymentType = types.includes(dto.type) ? dto.type : 'DeliveryFee';
    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
    if (Number.isNaN(paymentDate.getTime())) throw new BadRequestException('Enter a valid payment date');
    let mimeType: string | null = null;
    let fileName: string | null = null;
    if (receipt) {
      mimeType = this.detectReceiptMimeType(receipt.buffer);
      if (!mimeType) throw new BadRequestException('Receipt must be a valid PDF, JPEG, PNG, or WebP file');
      fileName = (receipt.originalname || 'receipt').replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180);
    }
    const id = randomUUID();
    const [payment] = await this.prisma.$queryRaw<any[]>`
      INSERT INTO "payments" ("id", "amount", "currency", "method", "status", "reference", "notes", "packageId", "customerId", "recordedById", "paymentDate", "paymentType", "receiptData", "receiptMimeType", "receiptFileName", "createdAt", "updatedAt")
      VALUES (${id}, ${amount}, ${dto.currency ?? 'NGN'}, ${method}::"PaymentMethod", 'COMPLETED'::"PaymentStatus", ${dto.reference || null}, ${dto.notes || null}, ${dto.packageId || null}, ${dto.customerId || null}, ${recordedById}, ${paymentDate}, ${paymentType}, ${receipt?.buffer ?? null}, ${mimeType}, ${fileName}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`;
    return { ...payment, type: payment.paymentType, hasReceipt: Boolean(receipt), status: 'Paid' };
  }

  async getReceipt(id: string) {
    const [receipt] = await this.prisma.$queryRaw<Array<{ receiptData: Buffer | null; receiptMimeType: string | null; receiptFileName: string | null }>>`SELECT "receiptData", "receiptMimeType", "receiptFileName" FROM "payments" WHERE "id" = ${id}`;
    if (!receipt) throw new NotFoundException('Payment not found');
    if (!receipt.receiptData || !receipt.receiptMimeType) throw new NotFoundException('No receipt is attached to this payment');
    return { data: Buffer.from(receipt.receiptData), mimeType: receipt.receiptMimeType, filename: receipt.receiptFileName ?? 'receipt' };
  }

  async settle() {
    const result = await this.prisma.payment.updateMany({ where: { status: 'PENDING' }, data: { status: 'COMPLETED' } });
    return { settledCount: result.count };
  }

  private detectReceiptMimeType(data: Buffer): string | null {
    if (data.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
    if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
    if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
    if (data.length >= 12 && data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
    return null;
  }

  async correct(id: string, newAmount: number, reason: string, correctedById: string) {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id } });
    return this.prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id }, data: { amount: newAmount } });
      await tx.paymentCorrection.create({
        data: { paymentId: id, correctedById, previousAmount: payment.amount, newAmount, reason },
      });
    });
  }
}
