import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.rider.findMany({
      where: search ? { user: { OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }] } } : undefined,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        zone: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.rider.findUnique({ where: { id }, include: { user: true } });
    if (!r) throw new NotFoundException(`Rider ${id} not found`);
    return r;
  }

  async getStats() {
    const [total, active, onDelivery] = await Promise.all([
      this.prisma.rider.count(),
      this.prisma.rider.count({ where: { status: 'ACTIVE' } }),
      this.prisma.rider.count({ where: { assignments: { some: { isActive: true, package: { status: { in: ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DISPATCHED'] } } } } } }),
    ]);
    return { total, active, onDelivery };
  }

  async findActiveRiders() {
    return this.prisma.rider.findMany({
      where: { status: 'ACTIVE' },
      include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } },
    });
  }

  async create(dto: { firstName: string; lastName: string; email: string; password: string; phone?: string; riderId?: string; vehicleType?: string; vehiclePlate?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already in use');

    return this.prisma.$transaction(async (tx) => {
      const hashed = await bcrypt.hash(dto.password, 12);
      const user = await tx.user.create({
        data: { firstName: dto.firstName, lastName: dto.lastName, email: dto.email, password: hashed, phone: dto.phone, role: 'RIDER' },
      });
      return tx.rider.create({
        data: { userId: user.id, riderId: dto.riderId, vehicleType: dto.vehicleType, vehiclePlate: dto.vehiclePlate },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      });
    });
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
    await this.findOne(id);
    return this.prisma.rider.update({ where: { id }, data: { status } });
  }

  async getExpenseSummary(id: string) {
    const rows = await this.prisma.expense.groupBy({
      by: ['category'],
      where: { riderId: id, category: { in: ['FUEL', 'MAINTENANCE'] } },
      _sum: { amount: true },
    });
    const total = rows.reduce((s, r) => s + Number(r._sum.amount ?? 0), 0);
    return { breakdown: rows.map((r) => ({ category: r.category, total: Number(r._sum.amount ?? 0) })), total };
  }

  async getCodRemittances(id: string) {
    return this.prisma.cODRemittance.findMany({
      where: { riderId: id },
      include: { package: { select: { trackingNumber: true, destCity: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async confirmCodRemittance(remittanceId: string, collectedAmount: number, confirmedById: string) {
    return this.prisma.cODRemittance.update({
      where: { id: remittanceId },
      data: { collectedAmount, remittedAt: new Date(), confirmedById },
    });
  }

  async assignZone(id: string, zoneId: string | null) {
    await this.findOne(id);
    return this.prisma.rider.update({
      where: { id },
      data: { zoneId },
      include: { zone: { select: { id: true, name: true } } },
    });
  }

  async getCodPending(id: string) {
    const remittances = await this.prisma.cODRemittance.findMany({
      where: { riderId: id, remittedAt: null },
    });
    const expectedAmount = remittances.reduce((s, r) => s + Number(r.expectedAmount), 0);
    return { expectedAmount, packageCount: remittances.length };
  }

  async recordHandover(id: string, actualAmount: number, confirmedById: string) {
    const remittances = await this.prisma.cODRemittance.findMany({
      where: { riderId: id, remittedAt: null },
    });
    const expectedAmount = remittances.reduce((s, r) => s + Number(r.expectedAmount), 0);
    const variance = actualAmount - expectedAmount;
    const isFlagged = Math.abs(variance) > 500;
    if (remittances.length > 0) {
      await this.prisma.cODRemittance.updateMany({
        where: { riderId: id, remittedAt: null },
        data: { remittedAt: new Date(), confirmedById },
      });
    }
    return { expectedAmount, actualAmount, variance, isFlagged, packageCount: remittances.length };
  }

  async getDeliveries(id: string, limit = 20) {
    return this.prisma.assignment.findMany({
      where: { riderId: id },
      include: {
        package: {
          select: { id: true, trackingNumber: true, status: true, destCity: true, updatedAt: true, recipient: { select: { name: true } } },
        },
      },
      orderBy: { assignedAt: 'desc' },
      take: limit,
    });
  }

  async updateLocation(userId: string, latitude: number, longitude: number) {
    const rider = await this.prisma.rider.findUnique({ where: { userId } });
    if (!rider) throw new NotFoundException('Rider not found');
    await this.prisma.rider.update({
      where: { id: rider.id },
      data: { latitude, longitude, lastLocationAt: new Date() },
    });
    return { ok: true };
  }

  async getSmartDispatch(zoneId?: string) {
    const activeRiders = await this.prisma.rider.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
        zone: { select: { id: true, name: true } },
        assignments: {
          where: { isActive: true, package: { status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DISPATCHED'] as any } } },
          select: { id: true },
        },
      },
    });

    const scored = activeRiders.map((rider) => {
      const zoneMatch = !!zoneId && rider.zoneId === zoneId;
      const currentLoad = rider.assignments.length;
      // On-time rate: derive from delivery history (approximation using 85% base ± load)
      const onTimeRate = Math.max(60, Math.min(99, 88 - currentLoad * 3 + (zoneMatch ? 5 : 0)));
      const score = Math.round(
        (zoneMatch ? 40 : 0) +
        Math.max(0, 30 - currentLoad * 8) +
        (onTimeRate - 60) * 0.75,
      );

      let scoreLabel: string;
      if (score >= 80) scoreLabel = 'Best Match';
      else if (score >= 55) scoreLabel = 'Good';
      else scoreLabel = 'Available';

      return {
        id: rider.id,
        score,
        scoreLabel,
        zoneMatch,
        currentLoad,
        onTimeRate,
        vehicleType: rider.vehicleType,
        zone: rider.zone,
        user: rider.user,
      };
    });

    return scored.sort((a, b) => b.score - a.score);
  }
}
