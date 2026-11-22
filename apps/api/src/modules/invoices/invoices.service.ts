import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus, BillingCycle, PackageStatus } from '@cityrider/database';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(customerId: string, createdById: string, opts: { notes?: string; dueDays?: number } = {}) {
    const customer = await this.prisma.customer.findUniqueOrThrow({ where: { id: customerId } });

    const now = new Date();
    const periodEnd = now;
    const periodStart = new Date(now);
    if (customer.billingCycle === BillingCycle.WEEKLY) {
      periodStart.setDate(now.getDate() - 7);
    } else {
      periodStart.setMonth(now.getMonth() - 1);
    }

    // Find DELIVERED packages not yet invoiced in this billing period
    const packages = await this.prisma.package.findMany({
      where: {
        senderId: customerId,
        status: PackageStatus.DELIVERED,
        invoicedAt: null,
        updatedAt: { gte: periodStart, lte: periodEnd },
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
    const vatRate = 0.075;
    const vatAmount = subtotal * vatRate;
    const totalAmount = subtotal + vatAmount;
    const dueDate = new Date(now);
    dueDate.setDate(now.getDate() + (opts.dueDays ?? 14));

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
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { payments: true },
    });

    await this.prisma.invoicePayment.create({
      data: {
        invoiceId,
        amount: dto.amount,
        method: dto.method as any,
        reference: dto.reference,
        notes: dto.notes,
        recordedById,
      },
    });

    // recalculate status
    const totalPaid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0) + dto.amount;
    const total = Number(invoice.totalAmount);
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
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const dayOfMonth = today.getDate();

    // weekly customers: generate every Monday (dayOfWeek === 1)
    // monthly customers: generate on 1st of month
    const weeklyDue = dayOfWeek === 1;
    const monthlyDue = dayOfMonth === 1;
    if (!weeklyDue && !monthlyDue) return;

    const customers = await this.prisma.customer.findMany({
      where: {
        status: 'ACTIVE',
        paymentTerms: 'INVOICE',
        billingCycle: weeklyDue && monthlyDue ? undefined : weeklyDue ? 'WEEKLY' : 'MONTHLY',
      },
    });

    for (const customer of customers) {
      try {
        await this.create(customer.id, 'system', {});
      } catch {
        // skip customers with no uninvoiced packages
      }
    }
  }
}
