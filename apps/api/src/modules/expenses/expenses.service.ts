import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { randomUUID } from 'node:crypto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async findAll(query: { category?: string; riderId?: string; vehicleId?: string; from?: string; to?: string; search?: string; status?: string; page?: number; limit?: number } = {}) {
    const { category, riderId, vehicleId, from, to, search, status, page = 1, limit = 20 } = query;
    const where: any = {
      ...(riderId ? { riderId } : {}),
      ...(vehicleId ? { vehicleId } : {}),
      ...(from || to ? { expenseDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}) } } : {}),
      ...(search ? { OR: [{ description: { contains: search, mode: 'insensitive' } }, { payee: { contains: search, mode: 'insensitive' } }] } : {}),
    };
    const all = await this.prisma.expense.findMany({
      where,
      include: {
        rider: { include: { user: { select: { firstName: true, lastName: true } } } },
        vehicle: { select: { id: true, plateNumber: true } },
        recordedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { expenseDate: 'desc' },
    });
    const states = await this.prisma.$queryRaw<Array<{ id: string; approvalStatus: string; approvalNote: string | null; approvedAt: Date | null }>>`SELECT "id", "approvalStatus", "approvalNote", "approvedAt" FROM "expenses"`;
    const byId = new Map(states.map((row) => [row.id, row]));
    const filtered = all.map((expense) => {
      const approval = byId.get(expense.id) ?? { approvalStatus: 'Approved', approvalNote: null, approvedAt: null };
      return { ...expense, ...approval, hasReceipt: expense.attachmentUrl?.startsWith('/expenses/') ?? false, status: approval.approvalStatus };
    })
      .filter((expense) => !category || String(expense.category) === this.categoryCode(category))
      .filter((expense) => !status || expense.approvalStatus.toLowerCase() === status.toLowerCase());
    const data = filtered.slice((page - 1) * limit, page * limit);
    const summary = await this.getSummary();
    return { data, meta: { total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) }, summary };
  }

  async getSummary() {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const [thisMonth, lastMonth] = await Promise.all([
      this.prisma.expense.aggregate({ where: { expenseDate: { gte: thisMonthStart } }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: { expenseDate: { gte: lastMonthStart, lt: thisMonthStart } }, _sum: { amount: true } }),
    ]);
    return { thisMonth: Number(thisMonth._sum.amount ?? 0), lastMonth: Number(lastMonth._sum.amount ?? 0) };
  }

  async getCategories() {
    return this.prisma.$queryRaw<Array<{ code: string; label: string }>>`SELECT "code"::text AS "code", "label" FROM "expense_category_options" WHERE "isActive" = TRUE ORDER BY "label"`;
  }

  async create(dto: any, recordedById: string, receipt?: Express.Multer.File) {
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Expense amount must be greater than zero');
    const category = this.categoryCode(dto.category);
    const [enabled] = await this.prisma.$queryRaw<Array<{ code: string }>>`SELECT "code"::text AS "code" FROM "expense_category_options" WHERE "code"::text = ${category} AND "isActive" = TRUE`;
    if (!enabled) throw new BadRequestException('Select an active expense category');
    const settings = await this.prisma.systemSettings.findUnique({ where: { id: 'default' }, select: { expenseApprovalThreshold: true } });
    const approvalStatus = settings && amount > Number(settings.expenseApprovalThreshold) ? 'PendingApproval' : 'Approved';
    const expenseDate = dto.date ? new Date(dto.date) : dto.expenseDate ? new Date(dto.expenseDate) : new Date();
    let receiptMimeType: string | null = null;
    let receiptFileName: string | null = null;
    if (receipt) {
      if (receipt.size > 10 * 1024 * 1024) throw new BadRequestException('Receipt must be 10 MB or smaller');
      receiptMimeType = this.detectReceiptMimeType(receipt.buffer);
      if (!receiptMimeType) throw new BadRequestException('Receipt must be a valid PDF, JPEG, PNG, or WebP file');
      receiptFileName = (receipt.originalname || 'receipt').replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180);
    }
    const id = randomUUID();
    const [expense] = await this.prisma.$queryRaw<any[]>`
      INSERT INTO "expenses" ("id", "amount", "currency", "category", "description", "payee", "paymentMethod", "packageId", "riderId", "vehicleId", "attachmentUrl", "attachmentData", "attachmentMimeType", "attachmentFileName", "recordedById", "expenseDate", "approvalStatus", "createdAt", "updatedAt")
      VALUES (${id}, ${amount}, ${dto.currency ?? 'NGN'}, ${category}::"ExpenseCategory", ${dto.description}, ${dto.payee ?? dto.paidTo ?? null}, ${dto.paymentMethod || null}::"PaymentMethod", ${dto.packageId ?? null}, ${dto.riderId ?? null}, ${dto.vehicleId ?? null}, ${receipt ? `/expenses/${id}/receipt` : dto.attachmentUrl || null}, ${receipt?.buffer ?? null}, ${receiptMimeType}, ${receiptFileName}, ${recordedById}, ${expenseDate}, ${approvalStatus}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING "id", "amount", "currency", "category", "description", "payee", "paymentMethod", "attachmentUrl", "attachmentMimeType", "attachmentFileName", "recordedById", "expenseDate", "approvalStatus", "createdAt", "updatedAt"
    `;
    this.audit.log({ userId: recordedById, action: 'CREATE', entity: 'Expense', entityId: expense.id, newValue: { amount, category, approvalStatus, receiptFileName } }).catch(() => void 0);
    return expense;
  }

  async getReceipt(id: string) {
    const [receipt] = await this.prisma.$queryRaw<Array<{ attachmentData: Buffer | null; attachmentMimeType: string | null; attachmentFileName: string | null }>>`
      SELECT "attachmentData", "attachmentMimeType", "attachmentFileName" FROM "expenses" WHERE "id" = ${id}
    `;
    if (!receipt) throw new NotFoundException('Expense not found');
    if (!receipt.attachmentData || !receipt.attachmentMimeType) throw new NotFoundException('No receipt is attached to this expense');
    return { data: Buffer.from(receipt.attachmentData), mimeType: receipt.attachmentMimeType, filename: receipt.attachmentFileName ?? 'receipt' };
  }

  private detectReceiptMimeType(data: Buffer): string | null {
    if (data.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
    if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
    if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
    if (data.length >= 12 && data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
    return null;
  }

  async approve(id: string, approverId: string) {
    const [expense] = await this.prisma.$queryRaw<Array<{ id: string; approvalStatus: string; recordedById: string }>>`SELECT "id", "approvalStatus", "recordedById" FROM "expenses" WHERE "id" = ${id}`;
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.approvalStatus !== 'PendingApproval') throw new BadRequestException('Only pending expenses can be approved');
    if (expense.recordedById === approverId) throw new BadRequestException('The person who entered an expense cannot approve it');
    await this.prisma.$executeRaw`UPDATE "expenses" SET "approvalStatus" = 'Approved', "approvedById" = ${approverId}, "approvedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id}`;
    this.audit.log({ userId: approverId, action: 'UPDATE', entity: 'Expense', entityId: id, previousValue: { approvalStatus: expense.approvalStatus }, newValue: { approvalStatus: 'Approved' } }).catch(() => void 0);
    return { success: true, id, approvalStatus: 'Approved' };
  }

  async reject(id: string, approverId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('A rejection reason is required');
    const [expense] = await this.prisma.$queryRaw<Array<{ id: string; approvalStatus: string; recordedById: string }>>`SELECT "id", "approvalStatus", "recordedById" FROM "expenses" WHERE "id" = ${id}`;
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.approvalStatus !== 'PendingApproval') throw new BadRequestException('Only pending expenses can be rejected');
    if (expense.recordedById === approverId) throw new BadRequestException('The person who entered an expense cannot reject it');
    await this.prisma.$executeRaw`UPDATE "expenses" SET "approvalStatus" = 'Rejected', "approvedById" = ${approverId}, "approvedAt" = CURRENT_TIMESTAMP, "approvalNote" = ${reason.trim()} WHERE "id" = ${id}`;
    this.audit.log({ userId: approverId, action: 'UPDATE', entity: 'Expense', entityId: id, previousValue: { approvalStatus: expense.approvalStatus }, newValue: { approvalStatus: 'Rejected', reason: reason.trim() } }).catch(() => void 0);
    return { success: true, id, approvalStatus: 'Rejected' };
  }

  private categoryCode(value: string) {
    const aliases: Record<string, string> = {
      Fuel: 'FUEL', Maintenance: 'MAINTENANCE', 'Vehicle Maintenance / Repairs': 'MAINTENANCE',
      Tyres: 'TYRES', Servicing: 'SERVICING', Parts: 'PARTS', 'Toll / Parking': 'TOLL_PARKING',
      Salary: 'RIDER_COMPENSATION', Bonus: 'RIDER_COMPENSATION', Office: 'OFFICE', Marketing: 'MARKETING', Other: 'OTHER',
    };
    return aliases[value] ?? String(value).toUpperCase().replace(/[ -]+/g, '_');
  }
}
