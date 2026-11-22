import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private range(from?: string, to?: string) {
    const gte = from ? new Date(from) : undefined;
    const lte = to ? new Date(to + 'T23:59:59') : undefined;
    return gte || lte ? { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } : undefined;
  }

  async getDeliverySummary(from?: string, to?: string) {
    const dateRange = this.range(from, to);
    const where = dateRange ? { createdAt: dateRange } : {};

    const [all, byStatus] = await Promise.all([
      this.prisma.package.findMany({ where, select: { status: true, createdAt: true } }),
      this.prisma.package.groupBy({ by: ['status'], where, _count: { _all: true } }),
    ]);

    const total = all.length;
    const totalDelivered = all.filter((p) => p.status === 'DELIVERED').length;
    const successRate = total > 0 ? Math.round((totalDelivered / total) * 100) : 0;

    // Bucket by day
    const dayMap: Record<string, { delivered: number; failed: number }> = {};
    for (const p of all) {
      const day = new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      dayMap[day] = dayMap[day] ?? { delivered: 0, failed: 0 };
      if (p.status === 'DELIVERED') dayMap[day].delivered++;
      else if (p.status === 'DELIVERY_ATTEMPTED' || p.status === 'RETURNED') dayMap[day].failed++;
    }

    return {
      total,
      totalDelivered,
      successRate,
      byDay: Object.entries(dayMap).map(([date, v]) => ({ date, ...v })),
      byStatus: byStatus.map((s) => ({ name: s.status.replace(/_/g, ' '), value: s._count._all })),
    };
  }

  async getRevenue(from?: string, to?: string) {
    const dateRange = this.range(from, to);
    const where = dateRange ? { paymentDate: dateRange } : {};

    const payments = await this.prisma.payment.findMany({
      where,
      select: { paymentDate: true, amount: true, method: true },
    });

    const total = payments.reduce((s, p) => s + Number(p.amount), 0);

    const dayMap: Record<string, number> = {};
    for (const p of payments) {
      const day = new Date(p.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      dayMap[day] = (dayMap[day] ?? 0) + Number(p.amount);
    }

    const methodMap: Record<string, number> = {};
    for (const p of payments) {
      methodMap[p.method] = (methodMap[p.method] ?? 0) + Number(p.amount);
    }

    return {
      total,
      transactionCount: payments.length,
      byDay: Object.entries(dayMap).map(([date, amount]) => ({ date, amount })),
      byMethod: Object.entries(methodMap).map(([method, amount]) => ({ method: method.replace(/_/g, ' '), amount })),
    };
  }

  async getRiderPerformance(from?: string, to?: string) {
    const dateRange = this.range(from, to);
    const where = dateRange ? { assignedAt: dateRange } : {};

    const assignments = await this.prisma.assignment.findMany({
      where,
      include: {
        rider: { include: { user: { select: { firstName: true, lastName: true } } } },
        package: { select: { status: true, deliveryFee: true } },
      },
    });

    const riderMap: Record<string, { name: string; total: number; delivered: number; earnings: number }> = {};
    for (const a of assignments) {
      const name = `${a.rider.user.firstName} ${a.rider.user.lastName}`;
      if (!riderMap[a.riderId]) riderMap[a.riderId] = { name, total: 0, delivered: 0, earnings: 0 };
      riderMap[a.riderId]!.total++;
      if (a.package?.status === 'DELIVERED') {
        riderMap[a.riderId]!.delivered++;
        riderMap[a.riderId]!.earnings += Number(a.package.deliveryFee ?? 0);
      }
    }

    return Object.values(riderMap).map((r) => ({
      riderName: r.name,
      deliveries: r.total,
      successRate: r.total > 0 ? Math.round((r.delivered / r.total) * 100) : 0,
      earnings: r.earnings,
    }));
  }

  async getProfitLoss(from?: string, to?: string) {
    const dateRange = this.range(from, to);
    const payWhere = dateRange ? { paymentDate: dateRange } : {};
    const expWhere = dateRange ? { expenseDate: dateRange } : {};

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [payAgg, expAgg, monthPayments, monthExpenses, expByCategory] = await Promise.all([
      this.prisma.payment.aggregate({ where: payWhere, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: expWhere, _sum: { amount: true } }),
      this.prisma.payment.findMany({
        where: { paymentDate: { gte: sixMonthsAgo } },
        select: { paymentDate: true, amount: true },
      }),
      this.prisma.expense.findMany({
        where: { expenseDate: { gte: sixMonthsAgo } },
        select: { expenseDate: true, amount: true },
      }),
      this.prisma.expense.groupBy({ by: ['category'], where: expWhere, _sum: { amount: true } }),
    ]);

    const revenue = Number(payAgg._sum.amount ?? 0);
    const expenses = Number(expAgg._sum.amount ?? 0);
    const profit = revenue - expenses;

    const byMonth = this.buildMonthly(monthPayments, monthExpenses, 6);

    return {
      revenue,
      expenses,
      profit,
      margin: revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0,
      byMonth,
      expenseBreakdown: expByCategory.map((e) => ({
        category: String(e.category).replace(/_/g, ' '),
        amount: Number(e._sum.amount ?? 0),
      })),
    };
  }

  async getCustomerActivity(from?: string, to?: string) {
    const dateRange = this.range(from, to);
    const where = dateRange ? { createdAt: dateRange } : {};

    const packages = await this.prisma.package.findMany({
      where,
      select: { senderId: true, deliveryFee: true, createdAt: true, sender: { select: { name: true } } },
    });

    const customerMap: Record<string, { name: string; shipments: number; spend: number; lastShipment: Date }> = {};
    for (const p of packages) {
      if (!p.senderId) continue;
      if (!customerMap[p.senderId]) customerMap[p.senderId] = { name: p.sender?.name ?? 'Unknown', shipments: 0, spend: 0, lastShipment: p.createdAt };
      customerMap[p.senderId]!.shipments++;
      customerMap[p.senderId]!.spend += Number(p.deliveryFee ?? 0);
      if (p.createdAt > customerMap[p.senderId]!.lastShipment) customerMap[p.senderId]!.lastShipment = p.createdAt;
    }

    return Object.values(customerMap)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 20);
  }

  private buildMonthly(payments: { paymentDate: Date; amount: any }[], expenses: { expenseDate: Date; amount: any }[], months: number) {
    const result: { month: string; revenue: number; expenses: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const label = start.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      const revenue = payments.filter((p) => { const d = new Date(p.paymentDate); return d >= start && d <= end; }).reduce((s, p) => s + Number(p.amount), 0);
      const exp = expenses.filter((e) => { const d = new Date(e.expenseDate); return d >= start && d <= end; }).reduce((s, e) => s + Number(e.amount), 0);
      result.push({ month: label, revenue, expenses: exp });
    }
    return result;
  }

  async getSlaBreach(from?: string, to?: string) {
    const slaHours = 4;
    const dateRange = this.range(from, to);
    const where: any = { status: { in: ['IN_TRANSIT', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DISPATCHED'] } };
    if (dateRange) where.createdAt = dateRange;

    const packages = await this.prisma.package.findMany({
      where,
      include: {
        assignments: {
          where: { isActive: true },
          include: { rider: { include: { user: { select: { firstName: true, lastName: true } } } } },
        },
      },
    });

    const breached = packages.filter((p) => {
      const hours = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60);
      return hours > slaHours;
    });

    const byRider: Record<string, { riderName: string; count: number }> = {};
    for (const p of breached) {
      const rider = p.assignments[0]?.rider;
      if (!rider) continue;
      const name = `${rider.user.firstName} ${rider.user.lastName}`;
      byRider[rider.id] = byRider[rider.id] ?? { riderName: name, count: 0 };
      byRider[rider.id]!.count++;
    }

    return {
      total: breached.length,
      packages: breached.map((p) => {
        const rider = p.assignments[0]?.rider;
        const hoursElapsed = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60);
        return {
          id: p.id,
          trackingNumber: p.trackingNumber,
          status: p.status,
          destCity: p.destCity,
          hoursElapsed: Math.round(hoursElapsed * 10) / 10,
          riderName: rider ? `${rider.user.firstName} ${rider.user.lastName}` : null,
        };
      }),
      byRider: Object.values(byRider).sort((a, b) => b.count - a.count),
    };
  }

  async getRevenueByZone(from?: string, to?: string) {
    const dateRange = this.range(from, to);
    const where: any = {};
    if (dateRange) where.createdAt = dateRange;

    const [packages, zones] = await Promise.all([
      this.prisma.package.findMany({
        where,
        select: { deliveryFee: true, toZoneId: true, destCity: true, status: true },
      }),
      this.prisma.zone.findMany({ select: { id: true, name: true } }),
    ]);

    const zoneNames = new Map(zones.map((z) => [z.id, z.name]));

    const zoneMap: Record<string, { zone: string; revenue: number; shipments: number; delivered: number }> = {};
    for (const p of packages) {
      const zoneId = p.toZoneId ?? `city:${p.destCity ?? 'unknown'}`;
      const zoneName = p.toZoneId ? (zoneNames.get(p.toZoneId) ?? 'Unknown Zone') : (p.destCity ?? 'No Zone');
      if (!zoneMap[zoneId]) zoneMap[zoneId] = { zone: zoneName, revenue: 0, shipments: 0, delivered: 0 };
      zoneMap[zoneId]!.shipments++;
      zoneMap[zoneId]!.revenue += Number(p.deliveryFee ?? 0);
      if (p.status === 'DELIVERED') zoneMap[zoneId]!.delivered++;
    }

    return Object.values(zoneMap)
      .map((z) => ({ ...z, successRate: z.shipments > 0 ? Math.round((z.delivered / z.shipments) * 100) : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  // Legacy endpoints kept for backward compat
  async getPackageSummary(dateFrom?: string, dateTo?: string) { return this.getDeliverySummary(dateFrom, dateTo); }
  async getRiderActivity(dateFrom?: string, dateTo?: string) { return this.getRiderPerformance(dateFrom, dateTo); }
  async getFinancialSummary(dateFrom?: string, dateTo?: string) { return this.getProfitLoss(dateFrom, dateTo); }
}
