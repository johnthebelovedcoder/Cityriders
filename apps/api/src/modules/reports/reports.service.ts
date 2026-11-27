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

    const [payments, invoicePayments] = await Promise.all([
      this.prisma.payment.findMany({ where: { ...where, status: 'COMPLETED' }, select: { paymentDate: true, amount: true, method: true } }),
      this.prisma.invoicePayment.findMany({ where: dateRange ? { recordedAt: dateRange } : undefined, select: { recordedAt: true, amount: true, method: true } }),
    ]);
    const receipts = [
      ...payments.map((p) => ({ date: p.paymentDate, amount: p.amount, method: p.method })),
      ...invoicePayments.map((p) => ({ date: p.recordedAt, amount: p.amount, method: p.method })),
    ];
    const total = receipts.reduce((s, p) => s + Number(p.amount), 0);

    const dayMap: Record<string, number> = {};
    for (const p of receipts) {
      const day = new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      dayMap[day] = (dayMap[day] ?? 0) + Number(p.amount);
    }

    const methodMap: Record<string, number> = {};
    for (const p of receipts) {
      methodMap[p.method] = (methodMap[p.method] ?? 0) + Number(p.amount);
    }

    return {
      total,
      transactionCount: receipts.length,
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

    const [payAgg, invoicePayAgg, expAgg, monthPayments, monthInvoicePayments, monthExpenses, expByCategory] = await Promise.all([
      this.prisma.payment.aggregate({ where: { ...payWhere, status: 'COMPLETED' }, _sum: { amount: true } }),
      this.prisma.invoicePayment.aggregate({ where: dateRange ? { recordedAt: dateRange } : {}, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: expWhere, _sum: { amount: true } }),
      this.prisma.payment.findMany({
        where: { paymentDate: { gte: sixMonthsAgo }, status: 'COMPLETED' },
        select: { paymentDate: true, amount: true },
      }),
      this.prisma.invoicePayment.findMany({ where: { recordedAt: { gte: sixMonthsAgo } }, select: { recordedAt: true, amount: true } }),
      this.prisma.expense.findMany({
        where: { expenseDate: { gte: sixMonthsAgo } },
        select: { expenseDate: true, amount: true },
      }),
      this.prisma.expense.groupBy({ by: ['category'], where: expWhere, _sum: { amount: true } }),
    ]);

    const revenue = Number(payAgg._sum.amount ?? 0) + Number(invoicePayAgg._sum.amount ?? 0);
    const expenses = Number(expAgg._sum.amount ?? 0);
    const profit = revenue - expenses;

    const byMonth = this.buildMonthly([...monthPayments, ...monthInvoicePayments.map((p) => ({ paymentDate: p.recordedAt, amount: p.amount }))], monthExpenses, 6);

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
    const where: any = { status: 'DELIVERED' };
    if (dateRange) where.statusHistory = { some: { status: 'DELIVERED', createdAt: dateRange } };
    const [packages, zones] = await Promise.all([
      this.prisma.package.findMany({
        where,
        select: {
          id: true, trackingNumber: true, destCity: true, toZoneId: true,
          statusHistory: { where: { status: { in: ['IN_TRANSIT', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DISPATCHED', 'DELIVERED'] } }, orderBy: { createdAt: 'asc' }, select: { status: true, createdAt: true } },
        },
      }),
      this.prisma.zone.findMany({ select: { id: true, name: true } }),
    ]);
    const zoneName = new Map(zones.map((z) => [z.id, z.name]));
    const records = packages.flatMap((pkg) => {
      const events = pkg.statusHistory;
      const start = [...events].reverse().find((e) => ['DISPATCHED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(e.status));
      const delivered = [...events].reverse().find((e) => e.status === 'DELIVERED');
      if (!start || !delivered) return [];
      const deliveryHours = Math.max(0, (delivered.createdAt.getTime() - start.createdAt.getTime()) / 3_600_000);
      return [{ trackingNumber: pkg.trackingNumber, zone: pkg.toZoneId ? zoneName.get(pkg.toZoneId) ?? 'Unknown' : pkg.destCity || 'Unassigned', date: delivered.createdAt.toISOString().slice(0, 10), deliveryHours, breached: deliveryHours > slaHours }];
    });
    const byDayMap = new Map<string, { date: string; delivered: number; breached: number }>();
    const byZoneMap = new Map<string, { zone: string; total: number; breached: number }>();
    for (const row of records) {
      const day = byDayMap.get(row.date) ?? { date: row.date, delivered: 0, breached: 0 };
      day.delivered++;
      if (row.breached) day.breached++;
      byDayMap.set(row.date, day);
      const zone = byZoneMap.get(row.zone) ?? { zone: row.zone, total: 0, breached: 0 };
      zone.total++;
      if (row.breached) zone.breached++;
      byZoneMap.set(row.zone, zone);
    }
    const breachedRecords = records.filter((r) => r.breached).sort((a, b) => b.deliveryHours - a.deliveryHours);
    const breachedPackages = breachedRecords.length;
    const avgDeliveryHours = records.length ? Number((records.reduce((s, r) => s + r.deliveryHours, 0) / records.length).toFixed(1)) : 0;
    return {
      slaHours,
      totalPackages: records.length,
      breachedPackages,
      breachRate: records.length ? Math.round(breachedPackages / records.length * 100) : 0,
      avgDeliveryHours,
      byDay: [...byDayMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
      byZone: [...byZoneMap.values()].map((z) => ({ ...z, breachRate: z.total ? Math.round(z.breached / z.total * 100) : 0 })),
      topBreached: breachedRecords.slice(0, 10).map((r) => ({ trackingNumber: r.trackingNumber, zone: r.zone, deliveryHours: Number(r.deliveryHours.toFixed(1)), slaHours })),
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
      if (p.status === 'DELIVERED') {
        zoneMap[zoneId]!.delivered++;
        zoneMap[zoneId]!.revenue += Number(p.deliveryFee ?? 0);
      }
    }

    const byZone = Object.values(zoneMap).map((z) => ({
      zone: z.zone,
      revenue: z.revenue,
      shipments: z.shipments,
      deliveries: z.delivered,
      avgFee: z.delivered ? z.revenue / z.delivered : 0,
      successRate: z.shipments > 0 ? Math.round((z.delivered / z.shipments) * 100) : 0,
    })).sort((a, b) => b.revenue - a.revenue);
    return { total: byZone.reduce((sum, z) => sum + z.revenue, 0), byZone };
  }

  async getYearOnYear() {
    const year = new Date().getFullYear();
    const statsFor = async (targetYear: number) => {
      const start = new Date(targetYear, 0, 1);
      const end = new Date(targetYear + 1, 0, 1);
      const [packages, payments, invoicePayments, delivered, total] = await Promise.all([
        this.prisma.package.findMany({ where: { createdAt: { gte: start, lt: end } }, select: { createdAt: true, status: true } }),
        this.prisma.payment.findMany({ where: { paymentDate: { gte: start, lt: end }, status: 'COMPLETED' }, select: { paymentDate: true, amount: true } }),
        this.prisma.invoicePayment.findMany({ where: { recordedAt: { gte: start, lt: end } }, select: { recordedAt: true, amount: true } }),
        this.prisma.package.count({ where: { statusHistory: { some: { status: 'DELIVERED', createdAt: { gte: start, lt: end } } } } }),
        this.prisma.package.count({ where: { createdAt: { gte: start, lt: end } } }),
      ]);
      const monthStats = Array.from({ length: 12 }, (_, month) => {
        const monthStart = new Date(targetYear, month, 1);
        const monthEnd = new Date(targetYear, month + 1, 1);
        const revenue = payments
          .filter((payment) => payment.paymentDate >= monthStart && payment.paymentDate < monthEnd)
          .reduce((sum, payment) => sum + Number(payment.amount), 0)
          + invoicePayments
            .filter((payment) => payment.recordedAt >= monthStart && payment.recordedAt < monthEnd)
            .reduce((sum, payment) => sum + Number(payment.amount), 0);
        return {
          month: monthStart.toLocaleDateString('en-GB', { month: 'short' }),
          revenue,
          packages: packages.filter((pkg) => pkg.createdAt >= monthStart && pkg.createdAt < monthEnd).length,
        };
      });
      return {
        packages: packages.length,
        revenue: payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
          + invoicePayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
        deliveries: delivered,
        successRate: total ? Math.round((delivered / total) * 100) : 0,
        monthStats,
      };
    };
    const [thisYear, lastYear] = await Promise.all([statsFor(year), statsFor(year - 1)]);
    const monthly = thisYear.monthStats.map((month, index) => ({
      month: month.month,
      thisYear: month.revenue,
      lastYear: lastYear.monthStats[index]!.revenue,
      thisYearPkgs: month.packages,
      lastYearPkgs: lastYear.monthStats[index]!.packages,
    }));
    const quarterly = Array.from({ length: 4 }, (_, quarter) => {
      const thisYearMonths = thisYear.monthStats.slice(quarter * 3, quarter * 3 + 3);
      const lastYearMonths = lastYear.monthStats.slice(quarter * 3, quarter * 3 + 3);
      return {
        quarter: `Q${quarter + 1}`,
        thisYearRev: thisYearMonths.reduce((sum, month) => sum + month.revenue, 0),
        lastYearRev: lastYearMonths.reduce((sum, month) => sum + month.revenue, 0),
        thisYearPkgs: thisYearMonths.reduce((sum, month) => sum + month.packages, 0),
        lastYearPkgs: lastYearMonths.reduce((sum, month) => sum + month.packages, 0),
      };
    });
    const { monthStats: _thisYearMonthStats, ...thisYearSummary } = thisYear;
    const { monthStats: _lastYearMonthStats, ...lastYearSummary } = lastYear;
    return { thisYear: thisYearSummary, lastYear: lastYearSummary, monthly, quarterly };
  }

  async getRoutePerformance(from?: string, to?: string) {
    const dateRange = this.range(from, to);
    const packages = await this.prisma.package.findMany({
      where: dateRange ? { createdAt: dateRange } : undefined,
      select: { toZoneId: true, destCity: true, status: true },
    });
    const zones = await this.prisma.zone.findMany({ select: { id: true, name: true } });
    const names = new Map(zones.map((z) => [z.id, z.name]));
    const grouped = new Map<string, { route: string; packages: number; delivered: number; unsuccessful: number; pending: number }>();
    for (const pkg of packages) {
      const key = pkg.toZoneId ?? `city:${pkg.destCity}`;
      const route = pkg.toZoneId ? names.get(pkg.toZoneId) ?? 'Unknown route' : pkg.destCity || 'Unassigned route';
      const row = grouped.get(key) ?? { route, packages: 0, delivered: 0, unsuccessful: 0, pending: 0 };
      row.packages++;
      if (pkg.status === 'DELIVERED') row.delivered++;
      else if (['FAILED', 'DELIVERY_ATTEMPTED', 'RETURNED', 'CANCELLED'].includes(pkg.status)) row.unsuccessful++;
      else row.pending++;
      grouped.set(key, row);
    }
    return [...grouped.entries()].map(([routeId, r]) => ({ routeId, ...r, completionRate: r.packages ? Math.round(r.delivered / r.packages * 100) : 0 }));
  }

  async getDeliveryExceptions(from?: string, to?: string) {
    const dateRange = this.range(from, to);
    const where: any = { status: { in: ['DELIVERY_ATTEMPTED', 'FAILED'] } };
    if (dateRange) where.updatedAt = dateRange;
    return this.prisma.package.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 500,
      select: {
        trackingNumber: true, orderReference: true, status: true, updatedAt: true, reattemptAt: true,
        sender: { select: { name: true } }, recipient: { select: { name: true } },
        statusHistory: { where: { status: { in: ['DELIVERY_ATTEMPTED', 'FAILED'] } }, orderBy: { createdAt: 'desc' }, take: 1, select: { note: true, failedReason: true, failureReasonCode: { select: { label: true } }, createdAt: true } },
      },
    });
  }

  async getInvoiceAging() {
    const now = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: { status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'DISPUTED'] }, dueDate: { lt: now } },
      include: { customer: { select: { name: true } }, payments: { select: { amount: true } } },
      orderBy: { dueDate: 'asc' },
    });
    return invoices.map((invoice) => {
      const balance = Math.max(0, Number(invoice.totalAmount) - invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0));
      const daysOverdue = Math.floor((now.getTime() - invoice.dueDate.getTime()) / 86_400_000);
      const bucket = daysOverdue <= 30 ? '1-30' : daysOverdue <= 60 ? '31-60' : daysOverdue <= 90 ? '61-90' : '90+';
      return { invoiceNumber: invoice.invoiceNumber, customer: invoice.customer.name, dueDate: invoice.dueDate, daysOverdue, bucket, total: Number(invoice.totalAmount), balance, status: invoice.status };
    });
  }

  async getCustomerServiceActivity(from?: string, to?: string) {
    const dateRange = this.range(from, to);
    const [interactions, escalations] = await Promise.all([
      this.prisma.customerInteraction.findMany({ where: dateRange ? { createdAt: dateRange } : undefined, include: { customer: { select: { name: true } }, staff: { select: { firstName: true, lastName: true } }, package: { select: { trackingNumber: true } } }, orderBy: { createdAt: 'desc' }, take: 1000 }),
      this.prisma.escalation.findMany({ where: dateRange ? { createdAt: dateRange } : undefined, include: { customer: { select: { name: true } }, package: { select: { trackingNumber: true } } }, orderBy: { createdAt: 'desc' }, take: 1000 }),
    ]);
    return { interactions, escalations };
  }

  async getMaintenanceHistory(from?: string, to?: string) {
    const dateRange = this.range(from, to);
    return this.prisma.maintenance.findMany({
      where: dateRange ? { serviceDate: dateRange } : undefined,
      include: { vehicle: { select: { plateNumber: true, make: true, model: true } } },
      orderBy: { serviceDate: 'desc' },
      take: 1000,
    });
  }

  // Legacy endpoints kept for backward compat
  async getPackageSummary(dateFrom?: string, dateTo?: string) { return this.getDeliverySummary(dateFrom, dateTo); }
  async getRiderActivity(dateFrom?: string, dateTo?: string) { return this.getRiderPerformance(dateFrom, dateTo); }
  async getFinancialSummary(dateFrom?: string, dateTo?: string) { return this.getProfitLoss(dateFrom, dateTo); }
}
