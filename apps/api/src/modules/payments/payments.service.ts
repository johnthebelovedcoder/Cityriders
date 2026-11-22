import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: { dateFrom?: string; dateTo?: string; page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = query;
    return this.prisma.payment.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: { package: { select: { trackingNumber: true } }, customer: true },
      orderBy: { paymentDate: 'desc' },
    });
  }

  create(dto: any, recordedById: string) {
    return this.prisma.payment.create({
      data: {
        amount: dto.amount,
        currency: dto.currency ?? 'NGN',
        method: dto.method,
        reference: dto.reference,
        notes: dto.notes,
        packageId: dto.packageId,
        customerId: dto.customerId,
        paymentDate: new Date(dto.paymentDate),
        recordedById,
      },
    });
  }

  async correct(id: string, newAmount: number, reason: string, correctedById: string) {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id } });
    return this.prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id }, data: { amount: newAmount } });
      await tx.paymentCorrection.create({
        data: { paymentId: id, correctedById, previousAmount: payment.amount, newAmount, reason },
      });
    });
  }
}
