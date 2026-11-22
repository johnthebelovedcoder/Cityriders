import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string, paymentTerms?: string) {
    return this.prisma.customer.findMany({
      where: {
        ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } : {}),
        ...(paymentTerms ? { paymentTerms: paymentTerms as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const [total, newThisMonth, withPackages] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.customer.count({ where: { packages: { some: {} } } }),
    ]);
    return { total, newThisMonth, withPackages };
  }

  async findOne(id: string) {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Customer ${id} not found`);
    return c;
  }

  create(dto: {
    name: string; phone: string; email?: string; address?: string;
    type?: string; creditLimit?: number; paymentTerms?: string;
    billingCycle?: string; status?: string; taxId?: string;
  }) {
    return this.prisma.customer.create({ data: dto as any });
  }

  async update(id: string, dto: Partial<{
    name: string; phone: string; email: string; address: string;
    type: string; creditLimit: number; paymentTerms: string;
    billingCycle: string; status: string; taxId: string;
  }>) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: dto as any });
  }
}
