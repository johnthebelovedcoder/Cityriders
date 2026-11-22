import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_RATE = 5000;

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrGeneratePeriod(period: string) {
    const parts = period.split('-');
    const year = parseInt(parts[0]!, 10);
    const month = parseInt(parts[1]!, 10);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const riders = await this.prisma.rider.findMany({
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    const records = await Promise.all(
      riders.map(async (rider) => {
        const deliveries = await this.prisma.assignment.count({
          where: {
            riderId: rider.id,
            package: { status: 'DELIVERED' },
            assignedAt: { gte: start, lt: end },
          },
        });

        const existing = await this.prisma.payrollRecord.findUnique({
          where: { riderId_period: { riderId: rider.id, period } },
          include: { paidBy: { select: { firstName: true, lastName: true } } },
        });

        if (existing) {
          return { ...existing, riderName: `${rider.user.firstName} ${rider.user.lastName}`, deliveries };
        }

        const total = deliveries * DEFAULT_RATE;
        const created = await this.prisma.payrollRecord.create({
          data: { riderId: rider.id, period, deliveries, ratePerDelivery: DEFAULT_RATE, bonus: 0, total, status: 'DRAFT' },
        });
        return { ...created, riderName: `${rider.user.firstName} ${rider.user.lastName}`, deliveries };
      }),
    );

    const totalPayroll = records.reduce((s, r) => s + Number(r.total), 0);
    const paidOut = records.filter((r) => r.status === 'PAID').reduce((s, r) => s + Number(r.total), 0);
    const pending = totalPayroll - paidOut;

    return { period, records, summary: { totalPayroll, paidOut, pending, riderCount: riders.length } };
  }

  async markPaid(id: string, paidById: string) {
    const record = await this.prisma.payrollRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Payroll record ${id} not found`);
    return this.prisma.payrollRecord.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date(), paidById },
    });
  }

  async updateBonus(id: string, bonus: number) {
    const record = await this.prisma.payrollRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Payroll record ${id} not found`);
    const total = Number(record.deliveries) * Number(record.ratePerDelivery) + bonus;
    return this.prisma.payrollRecord.update({ where: { id }, data: { bonus, total } });
  }
}
