import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERY_ATTEMPTED', 'DELIVERED'],
  DELIVERY_ATTEMPTED: ['IN_TRANSIT', 'RETURNED', 'DELIVERED'],
};

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyDeliveries(userId: string) {
    const rider = await this.prisma.rider.findUnique({ where: { userId } });
    if (!rider) return [];
    return this.prisma.assignment.findMany({
      where: { riderId: rider.id, isActive: true },
      include: { package: { include: { sender: true, recipient: true } } },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async updateStatus(packageId: string, status: string, note: string | undefined, failedReason: string | undefined, performedById: string) {
    const pkg = await this.prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) throw new NotFoundException('Package not found');

    const allowed = ALLOWED_TRANSITIONS[pkg.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${pkg.status} to ${status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.package.update({ where: { id: packageId }, data: { status: status as any } });
      await tx.packageStatusEvent.create({
        data: { packageId, status: status as any, note, failedReason: failedReason as any, performedById, isCustomerVisible: true },
      });
    });
  }

  async submitProof(packageId: string, proof: { type: string; recipientName?: string; otpCode?: string; notes?: string }, submittedById: string) {
    return this.prisma.proofOfDelivery.create({
      data: { packageId, type: proof.type as any, recipientName: proof.recipientName, otpCode: proof.otpCode, notes: proof.notes, submittedById },
    });
  }
}
