import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomerPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverride(customerId: string) {
    return this.prisma.customerPricingOverride.findUnique({ where: { customerId } });
  }

  async upsertOverride(customerId: string, dto: any) {
    return this.prisma.customerPricingOverride.upsert({
      where: { customerId },
      create: {
        customerId,
        baseRateFlat: dto.baseRateFlat ? Number(dto.baseRateFlat) : undefined,
        baseRatePerKg: dto.baseRatePerKg ? Number(dto.baseRatePerKg) : undefined,
        discountPercent: dto.discountPercent ? Number(dto.discountPercent) : undefined,
        notes: dto.notes || undefined,
      },
      update: {
        baseRateFlat: dto.baseRateFlat !== '' ? (dto.baseRateFlat ? Number(dto.baseRateFlat) : null) : undefined,
        baseRatePerKg: dto.baseRatePerKg !== '' ? (dto.baseRatePerKg ? Number(dto.baseRatePerKg) : null) : undefined,
        discountPercent: dto.discountPercent !== '' ? (dto.discountPercent ? Number(dto.discountPercent) : null) : undefined,
        notes: dto.notes !== undefined ? (dto.notes || null) : undefined,
      },
    });
  }

  async deleteOverride(customerId: string) {
    return this.prisma.customerPricingOverride.deleteMany({ where: { customerId } });
  }
}
