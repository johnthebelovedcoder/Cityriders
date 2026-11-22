import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { category?: string; riderId?: string; vehicleId?: string; page?: number; limit?: number } = {}) {
    const { category, riderId, vehicleId, page = 1, limit = 20 } = query;
    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where: {
          ...(category ? { category: category as any } : {}),
          ...(riderId ? { riderId } : {}),
          ...(vehicleId ? { vehicleId } : {}),
        },
        include: {
          rider: { include: { user: { select: { firstName: true, lastName: true } } } },
          vehicle: { select: { id: true, plateNumber: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { expenseDate: 'desc' },
      }),
      this.prisma.expense.count({
        where: {
          ...(category ? { category: category as any } : {}),
          ...(riderId ? { riderId } : {}),
          ...(vehicleId ? { vehicleId } : {}),
        },
      }),
    ]);
    const summary = await this.getSummary();
    return { data, meta: { total, page, limit }, summary };
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

  create(dto: any, recordedById: string) {
    return this.prisma.expense.create({
      data: {
        amount: dto.amount,
        currency: dto.currency ?? 'NGN',
        category: dto.category,
        description: dto.description,
        payee: dto.payee ?? dto.paidTo,
        paymentMethod: dto.paymentMethod || undefined,
        packageId: dto.packageId,
        riderId: dto.riderId,
        vehicleId: dto.vehicleId,
        attachmentUrl: dto.attachmentUrl || undefined,
        expenseDate: dto.date ? new Date(dto.date) : dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
        recordedById,
      },
    });
  }
}
