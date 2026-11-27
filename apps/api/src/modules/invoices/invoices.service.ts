import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus, BillingCycle, PackageStatus } from '@cityrider/database';
import { AuditService } from '../audit/audit.service';
import { randomUUID } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async listPaymentProofs(invoiceId: string) {
    await this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { id: true } });
    return this.prisma.$queryRaw<any[]>`SELECT p."id", p."fileName" AS "filename", p."uploadedAt", CONCAT(u."firstName", ' ', u."lastName") AS "uploadedBy" FROM "invoice_payment_proofs" p JOIN "users" u ON u."id" = p."uploadedById" WHERE p."invoiceId" = ${invoiceId} ORDER BY p."uploadedAt" DESC`;
  }

  async uploadPaymentProof(invoiceId: string, file: Express.Multer.File | undefined, uploadedById: string) {
    if (!file) throw new BadRequestException('Choose a receipt file to upload');
    await this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { id: true } });
    const mimeType = this.detectReceiptMimeType(file.buffer);
    if (!mimeType) throw new BadRequestException('Receipt must be a valid PDF, JPEG, PNG, or WebP file');
    const filename = (file.originalname || 'payment-proof').replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180);
    const [proof] = await this.prisma.$queryRaw<any[]>`INSERT INTO "invoice_payment_proofs" ("id", "invoiceId", "fileName", "mimeType", "fileData", "uploadedById") VALUES (${randomUUID()}, ${invoiceId}, ${filename}, ${mimeType}, ${file.buffer}, ${uploadedById}) RETURNING "id", "fileName" AS "filename", "uploadedAt"`;
    return proof;
  }

  async getPaymentProof(invoiceId: string, proofId: string) {
    const [proof] = await this.prisma.$queryRaw<Array<{ fileName: string; mimeType: string; fileData: Buffer }>>`SELECT "fileName", "mimeType", "fileData" FROM "invoice_payment_proofs" WHERE "invoiceId" = ${invoiceId} AND "id" = ${proofId}`;
    if (!proof) throw new NotFoundException('Payment proof not found');
    return { filename: proof.fileName, mimeType: proof.mimeType, data: Buffer.from(proof.fileData) };
  }

  private detectReceiptMimeType(data: Buffer): string | null {
    if (data.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
    if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
    if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
    if (data.length >= 12 && data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
    return null;
  }

  async getCustomerStatement(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true, email: true } });
    if (!customer) throw new NotFoundException('Customer not found');
    const [invoices, adjustments] = await Promise.all([
      this.prisma.invoice.findMany({ where: { customerId, status: { not: 'VOID' } }, include: { payments: true }, orderBy: { createdAt: 'asc' } }),
      this.prisma.$queryRaw<any[]>`SELECT a."id", a."amount", a."reason", a."effectiveAt" FROM "customer_account_adjustments" a WHERE a."customerId" = ${customerId}`,
    ]);
    const transactions: Array<{ date: Date; type: string; reference: string | null; description: string; debit: number; credit: number }> = invoices.flatMap((invoice) => [
      { date: invoice.createdAt, type: 'INVOICE', reference: invoice.invoiceNumber, description: `Invoice ${invoice.invoiceNumber}`, debit: Number(invoice.totalAmount), credit: 0 },
      ...invoice.payments.map((payment) => ({ date: payment.recordedAt, type: 'PAYMENT', reference: payment.reference, description: `Payment for ${invoice.invoiceNumber}`, debit: 0, credit: Number(payment.amount) })),
    ]);
    for (const adjustment of adjustments) {
      const amount = Number(adjustment.amount);
      transactions.push({ date: adjustment.effectiveAt, type: amount < 0 ? 'CREDIT' : 'ADJUSTMENT', reference: adjustment.id, description: adjustment.reason, debit: amount > 0 ? amount : 0, credit: amount < 0 ? Math.abs(amount) : 0 });
    }
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    const rows = transactions.map((row) => {
      balance += row.debit - row.credit;
      return { ...row, balance };
    });
    return { customer, openingBalance: 0, closingBalance: balance, rows };
  }

  async recordCustomerAdjustment(customerId: string, input: { amount: number; reason: string }, recordedById: string) {
    if (!Number.isFinite(Number(input.amount)) || Number(input.amount) === 0) throw new BadRequestException('Adjustment amount must be a non-zero number');
    if (!input.reason?.trim()) throw new BadRequestException('Adjustment reason is required');
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer not found');
    const [adjustment] = await this.prisma.$queryRaw<any[]>`
      INSERT INTO "customer_account_adjustments" ("id", "customerId", "amount", "reason", "recordedById", "createdAt", "effectiveAt")
      VALUES (${randomUUID()}, ${customerId}, ${Number(input.amount)}, ${input.reason.trim()}, ${recordedById}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *
    `;
    this.audit.log({ userId: recordedById, action: 'CREATE', entity: 'CustomerAccountAdjustment', entityId: adjustment.id, newValue: { customerId, amount: Number(input.amount), reason: input.reason.trim() } }).catch(() => void 0);
    return adjustment;
  }

  findAll(query: { customerId?: string; status?: string; page?: number; limit?: number } = {}) {
    const { customerId, status, page = 1, limit = 25 } = query;
    return this.prisma.invoice.findMany({
      where: {
        ...(customerId ? { customerId } : {}),
        ...(status ? { status: status as InvoiceStatus } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        _count: { select: { lineItems: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findOne(id: string) {
    return this.prisma.invoice.findUniqueOrThrow({
      where: { id },
      include: {
        customer: true,
        lineItems: { include: { package: { select: { trackingNumber: true, destCity: true } } } },
        payments: { include: { recordedBy: { select: { firstName: true, lastName: true } } }, orderBy: { recordedAt: 'desc' } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async create(customerId: string, createdById: string, opts: { notes?: string; dueDays?: number; dueDate?: string; periodStart?: string; periodEnd?: string } = {}) {
    const customer = await this.prisma.customer.findUniqueOrThrow({ where: { id: customerId } });

    const now = new Date();
    const periodEnd = opts.periodEnd ? new Date(`${opts.periodEnd}T23:59:59.999`) : new Date(now);
    let periodStart: Date;
    if (opts.periodStart) {
      periodStart = new Date(`${opts.periodStart}T00:00:00`);
    } else if (customer.billingCycle === BillingCycle.DAILY) {
      periodStart = new Date(periodEnd);
      periodStart.setHours(0, 0, 0, 0);
    } else if (customer.billingCycle === BillingCycle.WEEKLY) {
      periodStart = new Date(periodEnd);
      periodStart.setDate(periodEnd.getDate() - 6);
      periodStart.setHours(0, 0, 0, 0);
      periodStart.setDate(periodStart.getDate() - ((periodStart.getDay() + 6) % 7));
    } else if (customer.billingCycle === BillingCycle.BI_WEEKLY) {
      periodStart = new Date(periodEnd);
      periodStart.setDate(periodEnd.getDate() - 13);
      periodStart.setHours(0, 0, 0, 0);
    } else {
      periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
    }

    // Find DELIVERED packages not yet invoiced in this billing period
    const packages = await this.prisma.package.findMany({
      where: {
        senderId: customerId,
        status: PackageStatus.DELIVERED,
        invoicedAt: null,
        statusHistory: { some: { status: PackageStatus.DELIVERED, createdAt: { gte: periodStart, lte: periodEnd } } },
      },
    });

    if (packages.length === 0) {
      throw new BadRequestException('No uninvoiced delivered packages found in the billing period');
    }

    const lineItems = packages.map((p) => ({
      packageId: p.id,
      trackingNumber: p.trackingNumber,
      description: `Delivery: ${p.originCity ?? '?'} → ${p.destCity}`,
      quantity: 1,
      unitPrice: p.deliveryFee ?? 0,
      lineTotal: p.deliveryFee ?? 0,
    }));

    const subtotal = lineItems.reduce((s, i) => s + Number(i.lineTotal), 0);
    const settings = await this.prisma.systemSettings.findUnique({ where: { id: 'default' }, select: { vatRate: true } });
    const vatRate = Number(settings?.vatRate ?? 0);
    const vatAmount = subtotal * vatRate;
    const totalAmount = subtotal + vatAmount;
    const dueDate = opts.dueDate ? new Date(opts.dueDate) : new Date(periodEnd);
    if (!opts.dueDate) dueDate.setDate(dueDate.getDate() + (opts.dueDays ?? 14));

    const invoiceNumber = `INV-${Date.now()}`;

    const invoice = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          createdById,
          subtotal,
          vatRate,
          vatAmount,
          totalAmount,
          dueDate,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          notes: opts.notes,
          lineItems: { create: lineItems },
        },
        include: { lineItems: true, customer: true },
      });
      // mark packages as invoiced
      await tx.package.updateMany({
        where: { id: { in: packages.map((p) => p.id) } },
        data: { invoicedAt: now },
      });
      return inv;
    });

    return invoice;
  }

  async recordPayment(invoiceId: string, dto: { amount: number; method: string; reference?: string; notes?: string }, recordedById: string) {
    if (!Number.isFinite(Number(dto.amount)) || Number(dto.amount) <= 0) throw new BadRequestException('Payment amount must be greater than zero');
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { payments: true },
    });

    const paidBefore = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
    const total = Number(invoice.totalAmount);
    if (paidBefore >= total) throw new BadRequestException('This invoice is already fully paid');
    if (Number(dto.amount) > total - paidBefore) throw new BadRequestException('Payment exceeds the invoice outstanding balance');
    await this.prisma.invoicePayment.create({
      data: { invoiceId, amount: dto.amount, method: dto.method as any, reference: dto.reference, notes: dto.notes, recordedById },
    });
    const totalPaid = paidBefore + Number(dto.amount);
    let status: InvoiceStatus;
    if (totalPaid >= total) status = InvoiceStatus.PAID;
    else if (totalPaid > 0) status = InvoiceStatus.PARTIALLY_PAID;
    else status = invoice.status;

    return this.prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
  }

  async updateStatus(id: string, status: InvoiceStatus) {
    return this.prisma.invoice.update({ where: { id }, data: { status, sentAt: status === InvoiceStatus.SENT ? new Date() : undefined } });
  }

  async generatePdf(id: string): Promise<Buffer> {
    const invoice = await this.findOne(id);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const settings = { companyName: 'CityRider Logistics', email: 'billing@cityrider.ng', phone: '+234 000 000 0000' };

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(settings.companyName, 50, 50);
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
        .text(settings.email, 50, 75).text(settings.phone, 50, 88);

      doc.fontSize(28).font('Helvetica-Bold').fillColor('#111827').text('INVOICE', 400, 50, { align: 'right' });
      doc.fontSize(10).font('Helvetica').fillColor('#374151')
        .text(`Invoice #: ${invoice.invoiceNumber}`, 400, 85, { align: 'right' })
        .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-GB')}`, 400, 100, { align: 'right' })
        .text(`Due: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}`, 400, 115, { align: 'right' });

      // Bill To
      doc.moveTo(50, 140).lineTo(545, 140).stroke('#e5e7eb');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text('BILL TO', 50, 150);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(invoice.customer.name, 50, 164);
      if (invoice.customer.email) doc.fontSize(9).font('Helvetica').fillColor('#6b7280').text(invoice.customer.email, 50, 178);
      if (invoice.customer.phone) doc.fontSize(9).font('Helvetica').fillColor('#6b7280').text(invoice.customer.phone, 50, 190);

      // Billing period
      doc.fontSize(9).fillColor('#6b7280')
        .text(`Billing period: ${new Date(invoice.billingPeriodStart).toLocaleDateString('en-GB')} – ${new Date(invoice.billingPeriodEnd).toLocaleDateString('en-GB')}`, 50, 210);

      // Line items table
      const tableTop = 235;
      doc.rect(50, tableTop, 495, 20).fill('#f3f4f6');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151')
        .text('Description', 55, tableTop + 6)
        .text('Tracking #', 240, tableTop + 6)
        .text('Qty', 350, tableTop + 6, { width: 40, align: 'center' })
        .text('Unit Price', 395, tableTop + 6, { width: 80, align: 'right' })
        .text('Total', 480, tableTop + 6, { width: 60, align: 'right' });

      let y = tableTop + 22;
      doc.font('Helvetica').fillColor('#111827');
      for (const item of invoice.lineItems) {
        doc.fontSize(9)
          .text(item.description, 55, y, { width: 180 })
          .text(item.trackingNumber ?? '—', 240, y, { width: 105 })
          .text(String(item.quantity), 350, y, { width: 40, align: 'center' })
          .text(`₦${Number(item.unitPrice).toLocaleString()}`, 395, y, { width: 80, align: 'right' })
          .text(`₦${Number(item.lineTotal).toLocaleString()}`, 480, y, { width: 60, align: 'right' });
        y += 18;
        doc.moveTo(50, y - 2).lineTo(545, y - 2).strokeColor('#f3f4f6').stroke();
      }

      // Totals
      y += 10;
      doc.moveTo(350, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
      y += 8;
      doc.fontSize(9).font('Helvetica').fillColor('#374151')
        .text('Subtotal', 350, y, { width: 125, align: 'right' })
        .text(`₦${Number(invoice.subtotal).toLocaleString()}`, 480, y, { width: 60, align: 'right' });
      y += 16;
      doc.text(`VAT (${(Number(invoice.vatRate) * 100).toFixed(1)}%)`, 350, y, { width: 125, align: 'right' })
        .text(`₦${Number(invoice.vatAmount).toLocaleString()}`, 480, y, { width: 60, align: 'right' });
      y += 16;
      doc.moveTo(350, y).lineTo(545, y).strokeColor('#111827').stroke();
      y += 8;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827')
        .text('TOTAL DUE', 350, y, { width: 125, align: 'right' })
        .text(`₦${Number(invoice.totalAmount).toLocaleString()}`, 480, y, { width: 60, align: 'right' });

      // Footer
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
        .text('Payment instructions: Bank transfer to GTBank 0123456789 — CityRider Logistics Ltd', 50, 720)
        .text(`Status: ${invoice.status}`, 50, 734);

      doc.end();
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runNightlyInvoiceGeneration() {
    const today = new Date();
    const dateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const dayOfMonth = today.getDate();
    const daysSinceYearStart = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 86_400_000);
    const biWeeklyDue = dayOfWeek === 1 && Math.floor(daysSinceYearStart / 7) % 2 === 0;
    const weeklyDue = dayOfWeek === 1;
    const monthlyDue = dayOfMonth === 1;

    const customers = await this.prisma.customer.findMany({
      where: {
        status: 'ACTIVE',
        paymentTerms: 'INVOICE',
        billingCycle: { in: [
          ...(monthlyDue ? [BillingCycle.MONTHLY] : []),
          ...(weeklyDue ? [BillingCycle.WEEKLY] : []),
          ...(biWeeklyDue ? [BillingCycle.BI_WEEKLY] : []),
          BillingCycle.DAILY,
        ] },
      },
    });

    for (const customer of customers) {
      try {
        let start: Date;
        let end: Date;
        if (customer.billingCycle === BillingCycle.DAILY) {
          end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 59, 59, 999);
          start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        } else if (customer.billingCycle === BillingCycle.WEEKLY || customer.billingCycle === BillingCycle.BI_WEEKLY) {
          end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 59, 59, 999);
          const days = customer.billingCycle === BillingCycle.BI_WEEKLY ? 13 : 6;
          start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - days);
          if (customer.billingCycle === BillingCycle.WEEKLY) start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
        } else {
          end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
          start = new Date(end.getFullYear(), end.getMonth(), 1);
        }
        await this.create(customer.id, 'system', { periodStart: dateOnly(start), periodEnd: dateOnly(end) });
      } catch {
        // skip customers with no uninvoiced packages
      }
    }
  }
}
