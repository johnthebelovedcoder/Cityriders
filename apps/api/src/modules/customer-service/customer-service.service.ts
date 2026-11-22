import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomerServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async searchPackages(q?: string, customerId?: string, recipientPhone?: string, dateFrom?: string, dateTo?: string) {
    const where: any = {};

    if (q) {
      where.OR = [
        { trackingNumber: { contains: q, mode: 'insensitive' } },
        { orderReference: { contains: q, mode: 'insensitive' } },
        { sender: { name: { contains: q, mode: 'insensitive' } } },
        { recipient: { name: { contains: q, mode: 'insensitive' } } },
        { recipient: { phone: { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (customerId) where.senderId = customerId;
    if (recipientPhone) where.recipient = { phone: { contains: recipientPhone, mode: 'insensitive' } };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59');
    }

    const packages = await this.prisma.package.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, phone: true, email: true } },
        recipient: { select: { name: true, phone: true, deliveryAddress: true } },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
        assignments: { where: { isActive: true }, include: { rider: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } } } },
      },
    });

    return packages;
  }

  async getPackageDetail(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: {
        sender: true,
        recipient: true,
        statusHistory: { orderBy: { createdAt: 'desc' }, include: { performedBy: { select: { firstName: true, lastName: true } } } },
        assignments: { orderBy: { assignedAt: 'desc' }, include: { rider: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } } } },
        proofOfDelivery: true,
        interactions: { orderBy: { createdAt: 'desc' }, include: { staff: { select: { firstName: true, lastName: true } } } },
        escalations: { orderBy: { createdAt: 'desc' }, include: { raisedBy: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    return pkg;
  }

  async listInteractions(packageId?: string, customerId?: string) {
    const where: any = {};
    if (packageId) where.packageId = packageId;
    if (customerId) where.customerId = customerId;
    return this.prisma.customerInteraction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { staff: { select: { firstName: true, lastName: true } } },
    });
  }

  async createInteraction(dto: {
    packageId?: string;
    customerId: string;
    staffId: string;
    channel: string;
    summary: string;
    actionTaken?: string;
    outcome?: string;
  }) {
    return this.prisma.customerInteraction.create({
      data: {
        packageId: dto.packageId,
        customerId: dto.customerId,
        staffId: dto.staffId,
        channel: dto.channel as any,
        summary: dto.summary,
        actionTaken: dto.actionTaken,
        outcome: dto.outcome,
      },
      include: { staff: { select: { firstName: true, lastName: true } } },
    });
  }

  async listEscalations(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    return this.prisma.escalation.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        raisedBy: { select: { firstName: true, lastName: true } },
        package: { select: { trackingNumber: true, status: true, destCity: true } },
        customer: { select: { name: true, phone: true } },
      },
    });
  }

  async createEscalation(dto: {
    packageId?: string;
    customerId?: string;
    raisedById: string;
    reason: string;
    priority: string;
    requestedAction: string;
  }) {
    return this.prisma.escalation.create({
      data: {
        packageId: dto.packageId,
        customerId: dto.customerId,
        raisedById: dto.raisedById,
        reason: dto.reason,
        priority: dto.priority as any,
        requestedAction: dto.requestedAction,
      },
      include: { raisedBy: { select: { firstName: true, lastName: true } } },
    });
  }

  async updateEscalation(id: string, dto: { status?: string; resolution?: string }) {
    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.resolution) data.resolution = dto.resolution;
    if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') data.resolvedAt = new Date();
    return this.prisma.escalation.update({ where: { id }, data });
  }
}
