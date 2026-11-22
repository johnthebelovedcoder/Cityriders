import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const settings = await this.prisma.systemSettings.findUnique({
      where: { id: 'default' },
      include: { zones: { include: { riders: { include: { user: { select: { firstName: true, lastName: true } } } } }, orderBy: { createdAt: 'asc' } } },
    });
    if (!settings) {
      return this.prisma.systemSettings.create({ data: { id: 'default' }, include: { zones: { include: { riders: { include: { user: { select: { firstName: true, lastName: true } } } } } } } });
    }
    return settings;
  }

  update(dto: Partial<{
    companyName: string; address: string; phone: string; email: string; currency: string;
    flatDeliveryFee: number; weightSurcharge: number; expenseApprovalThreshold: number;
    lowCreditThreshold: number; smsEnabled: boolean;
  }>) {
    return this.prisma.systemSettings.update({
      where: { id: 'default' },
      data: dto,
      include: { zones: true },
    });
  }

  addZone(name: string, basePrice: number) {
    return this.prisma.zone.create({ data: { settingsId: 'default', name, basePrice } });
  }

  updateZone(id: string, dto: { name?: string; basePrice?: number }) {
    return this.prisma.zone.update({ where: { id }, data: dto });
  }

  deleteZone(id: string) {
    return this.prisma.zone.delete({ where: { id } });
  }

  getFailureReasonCodes() {
    return this.prisma.failureReasonCode.findMany({ orderBy: { label: 'asc' } });
  }

  createFailureReasonCode(data: { code: string; label: string; description?: string }) {
    return this.prisma.failureReasonCode.create({ data: { ...data, isActive: true } });
  }

  updateFailureReasonCode(id: string, data: { label?: string; description?: string; isActive?: boolean }) {
    return this.prisma.failureReasonCode.update({ where: { id }, data });
  }

  deleteFailureReasonCode(id: string) {
    return this.prisma.failureReasonCode.update({ where: { id }, data: { isActive: false } });
  }

  getPricingMatrix() {
    return this.prisma.pricingMatrix.findMany({
      include: { fromZone: true, toZone: true },
      orderBy: [{ fromZone: { name: 'asc' } }, { toZone: { name: 'asc' } }],
    });
  }

  upsertPricingMatrix(fromZoneId: string, toZoneId: string, baseRate: number, perKgRate: number) {
    return this.prisma.pricingMatrix.upsert({
      where: { fromZoneId_toZoneId: { fromZoneId, toZoneId } },
      create: { fromZoneId, toZoneId, baseRate, perKgRate },
      update: { baseRate, perKgRate },
      include: { fromZone: true, toZone: true },
    });
  }

  deletePricingMatrix(id: string) {
    return this.prisma.pricingMatrix.delete({ where: { id } });
  }
}
