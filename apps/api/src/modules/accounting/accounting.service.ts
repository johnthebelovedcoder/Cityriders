import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [paymentsMonth, expensesMonth, allPayments, allExpenses, codMonth] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { paymentDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { expenseDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: { paymentDate: { gte: sixMonthsAgo } },
        select: { paymentDate: true, amount: true },
      }),
      this.prisma.expense.findMany({
        where: { expenseDate: { gte: sixMonthsAgo } },
        select: { expenseDate: true, amount: true, category: true },
      }),
      this.prisma.cODRemittance.aggregate({
        where: { remittedAt: { gte: monthStart } },
        _sum: { collectedAmount: true },
      }),
    ]);

    const deliveryFees = Number(paymentsMonth._sum.amount ?? 0);
    const cod = Number(codMonth._sum.collectedAmount ?? 0);
    const totalRevenue = deliveryFees + cod;
    const totalExpenses = Number(expensesMonth._sum.amount ?? 0);

    const monthlyTrend = this.buildMonthlyTrend(allPayments, allExpenses, 6);

    // Expense breakdown for current month
    const expenseByCategory: Record<string, number> = {};
    for (const e of allExpenses) {
      if (new Date(e.expenseDate) >= monthStart) {
        const cat = String(e.category);
        expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + Number(e.amount);
      }
    }

    return {
      monthlyTrend,
      revenue: {
        total: totalRevenue,
        deliveryFees,
        cod,
        other: 0,
      },
      expenses: {
        total: totalExpenses,
        salary: expenseByCategory['RIDER_COMPENSATION'] ?? 0,
        fuel: expenseByCategory['FUEL'] ?? 0,
        maintenance: expenseByCategory['MAINTENANCE'] ?? 0,
        marketing: expenseByCategory['MARKETING'] ?? 0,
        office: (expenseByCategory['OFFICE'] ?? 0) + (expenseByCategory['OTHER'] ?? 0),
      },
      profit: totalRevenue - totalExpenses,
    };
  }

  async getIncome(page = 1, limit = 25) {
    const [payments, remittances] = await Promise.all([
      this.prisma.payment.findMany({
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { package: { select: { trackingNumber: true } } },
      }),
      this.prisma.cODRemittance.findMany({
        where: { remittedAt: { not: null } },
        orderBy: { remittedAt: 'desc' },
        take: 25,
        include: { package: { select: { trackingNumber: true } }, rider: { include: { user: { select: { firstName: true, lastName: true } } } } },
      }),
    ]);

    const income = [
      ...payments.map((p) => ({
        id: p.id,
        date: p.paymentDate,
        source: p.package?.trackingNumber ?? 'Manual',
        category: 'Delivery Fee',
        amount: Number(p.amount),
        method: p.method,
        status: p.status === 'COMPLETED' ? 'Collected' : 'Pending',
      })),
      ...remittances.map((r) => ({
        id: r.id,
        date: r.remittedAt,
        source: r.package?.trackingNumber ?? 'COD',
        category: 'COD Collection',
        amount: Number(r.collectedAmount ?? 0),
        method: 'CASH',
        status: 'Collected',
      })),
    ];

    income.sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());
    return income.slice(0, limit);
  }

  async getCodReconciliation(page = 1, limit = 25) {
    const [data, total] = await Promise.all([
      this.prisma.cODRemittance.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          package: { select: { trackingNumber: true, destCity: true } },
          rider: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      this.prisma.cODRemittance.count(),
    ]);

    return {
      data: data.map((r) => ({
        id: r.id,
        trackingNumber: r.package?.trackingNumber,
        riderName: r.rider ? `${r.rider.user.firstName} ${r.rider.user.lastName}` : null,
        expectedAmount: Number(r.expectedAmount),
        collectedAmount: r.collectedAmount ? Number(r.collectedAmount) : null,
        variance: r.collectedAmount ? Number(r.collectedAmount) - Number(r.expectedAmount) : null,
        status: r.remittedAt ? 'REMITTED' : 'PENDING',
        remittedAt: r.remittedAt,
        createdAt: r.createdAt,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAccountingInvoices(page = 1, limit = 25) {
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true, email: true } } },
      }),
      this.prisma.invoice.count(),
    ]);

    return {
      data: data.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.name,
        amount: Number(inv.totalAmount),
        status: inv.status,
        issuedAt: inv.createdAt,
        dueAt: inv.dueDate,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private buildMonthlyTrend(
    payments: { paymentDate: Date; amount: any }[],
    expenses: { expenseDate: Date; amount: any }[],
    months: number,
  ) {
    const result: { month: string; revenue: number; expenses: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const label = start.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });

      const revenue = payments
        .filter((p) => { const d = new Date(p.paymentDate); return d >= start && d <= end; })
        .reduce((s, p) => s + Number(p.amount), 0);

      const expTotal = expenses
        .filter((e) => { const d = new Date(e.expenseDate); return d >= start && d <= end; })
        .reduce((s, e) => s + Number(e.amount), 0);

      result.push({ month: label, revenue, expenses: expTotal });
    }

    return result;
  }
}
