import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CustomerServiceService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private async coveredCustomerIds(userId: string, role: string): Promise<string[] | undefined> {
    if (role !== 'CUSTOMER_SERVICE') return undefined;
    const rows = await this.prisma.customerServiceCoverage.findMany({ where: { staffUserId: userId }, select: { customerId: true } });
    return rows.map((row) => row.customerId);
  }

  private async assertCustomerCoverage(customerId: string, userId: string, role: string) {
    const allowed = await this.coveredCustomerIds(userId, role);
    if (allowed && !allowed.includes(customerId)) throw new NotFoundException('Customer record not found');
  }

  async searchPackages(q: string | undefined, customerId: string | undefined, recipientPhone: string | undefined, dateFrom: string | undefined, dateTo: string | undefined, userId: string, role: string) {
    const where: any = {};
    const coveredIds = await this.coveredCustomerIds(userId, role);
    if (coveredIds) where.senderId = customerId ? { in: coveredIds.includes(customerId) ? [customerId] : [] } : { in: coveredIds };

    if (q) {
      where.OR = [
        { trackingNumber: { contains: q, mode: 'insensitive' } },
        { orderReference: { contains: q, mode: 'insensitive' } },
        { sender: { name: { contains: q, mode: 'insensitive' } } },
        { recipient: { name: { contains: q, mode: 'insensitive' } } },
        { recipient: { phone: { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (customerId && !coveredIds) where.senderId = customerId;
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
      },
    });

    return packages;
  }

  async getPackageDetail(id: string, userId: string, role: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, phone: true, email: true } },
        recipient: true,
        statusHistory: { orderBy: { createdAt: 'desc' }, include: { performedBy: { select: { firstName: true, lastName: true } } } },
        proofOfDelivery: { select: { type: true, recipientName: true, photoUrl: true, signatureUrl: true, notes: true, submittedAt: true } },
        interactions: { orderBy: { createdAt: 'desc' }, include: { staff: { select: { firstName: true, lastName: true } } } },
        escalations: { orderBy: { createdAt: 'desc' }, include: { raisedBy: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    await this.assertCustomerCoverage(pkg.senderId, userId, role);
    return pkg;
  }

  async getCustomerSummary(customerId: string, date: string | undefined, userId: string, role: string) {
    await this.assertCustomerCoverage(customerId, userId, role);
    const range = date ? {
      gte: new Date(`${date}T00:00:00`),
      lte: new Date(`${date}T23:59:59.999`),
    } : undefined;
    const where: any = { senderId: customerId };
    if (range) where.createdAt = range;
    const [customer, packages] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true } }),
      this.prisma.package.findMany({ where, select: { status: true } }),
    ]);
    if (!customer) throw new NotFoundException('Customer not found');
    const delivered = packages.filter((p) => p.status === 'DELIVERED').length;
    const unsuccessful = packages.filter((p) => ['DELIVERY_ATTEMPTED', 'FAILED', 'RETURNED', 'CANCELLED'].includes(p.status)).length;
    return { customer, date: date ?? null, submitted: packages.length, delivered, unsuccessful, inProgress: packages.length - delivered - unsuccessful };
  }

  async getCustomerPackages(customerId: string, userId: string, role: string) {
    await this.assertCustomerCoverage(customerId, userId, role);
    return this.prisma.package.findMany({
      where: { senderId: customerId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, trackingNumber: true, status: true, createdAt: true, updatedAt: true, reattemptAt: true,
        sender: { select: { name: true } }, recipient: { select: { name: true } }, destCity: true,
      },
    });
  }

  async getFollowups(userId: string, role: string) {
    const coveredIds = await this.coveredCustomerIds(userId, role);
    const now = new Date();
    return this.prisma.package.findMany({
      where: {
        status: 'DELIVERY_ATTEMPTED',
        ...(coveredIds ? { senderId: { in: coveredIds } } : {}),
        OR: [{ reattemptAt: null }, { reattemptAt: { lte: now } }],
      },
      orderBy: { updatedAt: 'asc' },
      take: 100,
      select: {
        id: true, trackingNumber: true, status: true, updatedAt: true, reattemptAt: true, destCity: true,
        sender: { select: { name: true } }, recipient: { select: { name: true } },
      },
    });
  }

  async listInteractions(packageId: string | undefined, customerId: string | undefined, userId: string, role: string) {
    const where: any = {};
    const coveredIds = await this.coveredCustomerIds(userId, role);
    if (coveredIds) where.customerId = customerId ? (coveredIds.includes(customerId) ? customerId : { in: [] }) : { in: coveredIds };
    else if (customerId) where.customerId = customerId;
    if (packageId) {
      const pkg = await this.prisma.package.findUnique({ where: { id: packageId }, select: { senderId: true } });
      if (!pkg) throw new NotFoundException('Package not found');
      await this.assertCustomerCoverage(pkg.senderId, userId, role);
      where.packageId = packageId;
    }
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
  }, role: string) {
    await this.assertCustomerCoverage(dto.customerId, dto.staffId, role);
    if (dto.packageId) {
      const pkg = await this.prisma.package.findUnique({ where: { id: dto.packageId }, select: { senderId: true } });
      if (!pkg || pkg.senderId !== dto.customerId) throw new NotFoundException('Package not found for this customer');
    }
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

  async listEscalations(status: string | undefined, userId: string, role: string) {
    const where: any = {};
    if (status) where.status = status;
    const coveredIds = await this.coveredCustomerIds(userId, role);
    if (coveredIds) where.OR = [{ customerId: { in: coveredIds } }, { package: { senderId: { in: coveredIds } } }];
    return this.prisma.escalation.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        raisedBy: { select: { firstName: true, lastName: true } },
        package: { select: { trackingNumber: true, status: true, destCity: true } },
        customer: { select: { name: true, phone: true } },
        events: { orderBy: { createdAt: 'asc' }, include: { changedBy: { select: { firstName: true, lastName: true } } } },
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
  }, role: string) {
    if (dto.customerId) await this.assertCustomerCoverage(dto.customerId, dto.raisedById, role);
    if (dto.packageId) {
      const pkg = await this.prisma.package.findUnique({ where: { id: dto.packageId }, select: { senderId: true } });
      if (!pkg) throw new NotFoundException('Package not found');
      await this.assertCustomerCoverage(pkg.senderId, dto.raisedById, role);
    }
    return this.prisma.$transaction(async (tx) => {
      const escalation = await tx.escalation.create({
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
      await tx.escalationEvent.create({
        data: { escalationId: escalation.id, changedById: dto.raisedById, status: escalation.status },
      });
      return escalation;
    });
  }

  async updateEscalation(id: string, dto: { status?: string; resolution?: string }, changedById: string, role: string) {
    const existing = await this.prisma.escalation.findUnique({ where: { id }, select: { id: true, customerId: true, package: { select: { senderId: true } } } });
    if (!existing) throw new NotFoundException('Escalation not found');
    if (existing.customerId) await this.assertCustomerCoverage(existing.customerId, changedById, role);
    if (existing.package) await this.assertCustomerCoverage(existing.package.senderId, changedById, role);
    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.resolution) data.resolution = dto.resolution;
    if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') data.resolvedAt = new Date();
    return this.prisma.$transaction(async (tx) => {
      const escalation = await tx.escalation.update({ where: { id }, data });
      await tx.escalationEvent.create({
        data: {
          escalationId: id,
          changedById,
          status: escalation.status,
          resolution: dto.resolution,
        },
      });
      return escalation;
    });
  }

  async assignCoverage(staffUserId: string, customerId: string, assignedById: string) {
    const staff = await this.prisma.user.findUnique({ where: { id: staffUserId }, select: { role: true } });
    if (!staff || staff.role !== 'CUSTOMER_SERVICE') throw new NotFoundException('Customer Service user not found');
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer not found');
    const coverage = await this.prisma.customerServiceCoverage.upsert({
      where: { staffUserId_customerId: { staffUserId, customerId } },
      create: { staffUserId, customerId, assignedById },
      update: {},
    });
    this.audit.log({ userId: assignedById, action: 'CREATE', entity: 'CustomerServiceCoverage', entityId: coverage.id, newValue: { staffUserId, customerId } }).catch(() => void 0);
    return coverage;
  }

  listCoverage(staffUserId?: string) {
    return this.prisma.customerServiceCoverage.findMany({
      where: staffUserId ? { staffUserId } : undefined,
      include: { staffUser: { select: { id: true, firstName: true, lastName: true, email: true } }, customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeCoverage(staffUserId: string, customerId: string, removedById: string) {
    const coverage = await this.prisma.customerServiceCoverage.delete({ where: { staffUserId_customerId: { staffUserId, customerId } } });
    this.audit.log({ userId: removedById, action: 'DELETE', entity: 'CustomerServiceCoverage', entityId: coverage.id, previousValue: { staffUserId, customerId } }).catch(() => void 0);
    return coverage;
  }
}
