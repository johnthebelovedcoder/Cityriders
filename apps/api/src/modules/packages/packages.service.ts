import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { generateTrackingNumber } from '@cityrider/utils';
import { PackageStatus } from '@cityrider/types';

import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { TrackingGateway } from '../tracking/tracking.gateway';

@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    @Optional() private readonly trackingGateway?: TrackingGateway,
  ) {}

  async findAll(query: { status?: string; search?: string; page?: number; limit?: number } = {}) {
    const { status, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { sender: { name: { contains: search, mode: 'insensitive' } } },
        { recipient: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.package.findMany({
        where,
        skip,
        take: limit,
        include: { sender: true, recipient: true, assignments: { where: { isActive: true }, include: { rider: { include: { user: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.package.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getStats(from?: string, to?: string) {
    const dateFilter = from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {};
    const [total, delivered, inTransit] = await Promise.all([
      this.prisma.package.count({ where: dateFilter }),
      this.prisma.package.count({ where: { ...dateFilter, status: 'DELIVERED' } }),
      this.prisma.package.count({ where: { ...dateFilter, status: { in: ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DISPATCHED', 'COLLECTED'] } } }),
    ]);
    return { total, delivered, inTransit };
  }

  async getKanban() {
    const statuses = ['AWAITING_ASSIGNMENT', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'] as const;
    const packages = await this.prisma.package.findMany({
      where: { status: { in: statuses as any } },
      include: {
        recipient: { select: { name: true, deliveryAddress: true } },
        assignments: { where: { isActive: true }, include: { rider: { include: { user: { select: { firstName: true, lastName: true } }, zone: { select: { name: true } } } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const columns: Record<string, typeof packages> = {};
    for (const s of statuses) columns[s] = [];
    for (const pkg of packages) columns[pkg.status as string]?.push(pkg);
    return columns;
  }

  async findOne(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: {
        sender: true,
        recipient: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        assignments: { include: { rider: { include: { user: true } }, assignedBy: true }, orderBy: { assignedAt: 'desc' } },
        proofOfDelivery: true,
      },
    });
    if (!pkg) throw new NotFoundException(`Package ${id} not found`);
    return pkg;
  }

  async findByTrackingNumber(trackingNumber: string) {
    return this.prisma.package.findUnique({ where: { trackingNumber } });
  }

  private async calcDeliveryFee(fromZoneId?: string, toZoneId?: string, weightKg?: number): Promise<number | undefined> {
    if (!fromZoneId || !toZoneId) return undefined;
    const matrix = await this.prisma.pricingMatrix.findUnique({ where: { fromZoneId_toZoneId: { fromZoneId, toZoneId } } });
    if (!matrix) {
      const settings = await this.prisma.systemSettings.findUnique({ where: { id: 'default' } });
      return settings ? Number(settings.flatDeliveryFee) : undefined;
    }
    const base = Number(matrix.baseRate);
    const perKg = Number(matrix.perKgRate);
    const extraKg = weightKg && weightKg > 1 ? weightKg - 1 : 0;
    return base + extraKg * perKg;
  }

  async create(dto: any, createdById: string) {
    const trackingNumber = await this.ensureUniqueTrackingNumber();
    const autoFee = dto.deliveryFee == null
      ? await this.calcDeliveryFee(dto.fromZoneId, dto.toZoneId, dto.weight)
      : undefined;

    const { pkg, recipient } = await this.prisma.$transaction(async (tx) => {
      const created = await tx.package.create({
        data: {
          trackingNumber,
          description: dto.description,
          weight: dto.weight,
          declaredValue: dto.declaredValue,
          deliveryFee: dto.deliveryFee ?? autoFee,
          specialInstructions: dto.specialInstructions,
          originStreet: dto.originAddress.street,
          originCity: dto.originAddress.city,
          originState: dto.originAddress.state,
          originCountry: dto.originAddress.country,
          originPostalCode: dto.originAddress.postalCode,
          originLandmark: dto.originAddress.landmark,
          destStreet: dto.destinationAddress.street,
          destCity: dto.destinationAddress.city,
          destState: dto.destinationAddress.state,
          destCountry: dto.destinationAddress.country,
          destPostalCode: dto.destinationAddress.postalCode,
          destLandmark: dto.destinationAddress.landmark,
          senderId: dto.senderId,
          recipientId: dto.recipientId,
          createdById,
          fromZoneId: dto.fromZoneId,
          toZoneId: dto.toZoneId,
          status: PackageStatus.REGISTERED,
        },
      });

      await tx.packageStatusEvent.create({
        data: { packageId: created.id, status: PackageStatus.REGISTERED, performedById: createdById, isCustomerVisible: true },
      });

      const rcpt = await tx.recipient.findUnique({ where: { id: dto.recipientId }, select: { phone: true, email: true } });

      return { pkg: created, recipient: rcpt };
    });

    // Fire intake SMS + email (non-blocking, outside transaction)
    if (recipient) {
      const appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
      this.notifications
        .notifyPackageIntake(recipient.phone, recipient.email, pkg.trackingNumber, appUrl)
        .catch(() => void 0);
    }

    return pkg;
  }

  async updateStatus(
    id: string,
    status: PackageStatus,
    note: string | undefined,
    performedById: string,
    opts?: { failureReasonCodeId?: string; reattemptAt?: string },
  ) {
    const pkg = await this.findOne(id);
    const previous = pkg.status;

    await this.prisma.$transaction(async (tx) => {
      const pkgUpdate: any = { status };
      if (opts?.reattemptAt) pkgUpdate.reattemptAt = new Date(opts.reattemptAt);
      await tx.package.update({ where: { id }, data: pkgUpdate });
      await tx.packageStatusEvent.create({
        data: {
          packageId: id, status, note, performedById, isCustomerVisible: true,
          failureReasonCodeId: opts?.failureReasonCodeId,
          reattemptAt: opts?.reattemptAt ? new Date(opts.reattemptAt) : undefined,
        },
      });
    });

    // Fire SMS + email notification (non-blocking)
    const appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    this.notifications
      .notifyPackageStatus(pkg.recipient.phone, pkg.recipient.email, pkg.trackingNumber, status, appUrl)
      .catch(() => void 0);

    // Audit log
    this.audit
      .log({ userId: performedById, action: 'STATUS_CHANGE', entity: 'Package', entityId: id, previousValue: { status: previous }, newValue: { status } })
      .catch(() => void 0);

    // WebSocket broadcast — notify tracking subscribers
    if (this.trackingGateway) {
      this.trackingGateway.broadcastPackageStatus({
        packageId: id,
        trackingNumber: pkg.trackingNumber,
        status,
      });
    }
  }

  private async parseUploadedFile(buffer: Buffer, filename: string): Promise<any[]> {
    const isExcel = /\.(xlsx|xls)$/i.test(filename) || (buffer[0] === 0x50 && buffer[1] === 0x4b);
    if (isExcel) {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]!]!;
      return XLSX.utils.sheet_to_json(ws, { defval: '' });
    }
    const { parse } = await import('csv-parse/sync');
    return parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
  }

  async bulkUpload(csvBuffer: Buffer, createdById: string, filename = 'upload.csv'): Promise<{ success: number; failed: number; errors: string[] }> {
    const rows: any[] = await this.parseUploadedFile(csvBuffer, filename);

    let success = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowLabel = `Row ${i + 2}`;
      try {
        if (!row.recipientName || !row.recipientPhone || !row.recipientAddress) {
          errors.push(`${rowLabel}: recipientName, recipientPhone and recipientAddress are required`);
          continue;
        }

        let recipient = await this.prisma.recipient.findFirst({ where: { phone: row.recipientPhone } });
        if (!recipient) {
          recipient = await this.prisma.recipient.create({
            data: { name: row.recipientName, phone: row.recipientPhone, deliveryAddress: row.recipientAddress },
          });
        } else {
          await this.prisma.recipient.update({ where: { id: recipient.id }, data: { name: row.recipientName, deliveryAddress: row.recipientAddress } });
        }

        // For sender: look up by senderPhone or create anonymous
        let sender = row.senderPhone
          ? await this.prisma.customer.findFirst({ where: { phone: row.senderPhone } })
          : null;
        if (!sender && row.senderName) {
          sender = await this.prisma.customer.create({ data: { name: row.senderName, phone: row.senderPhone || `BULK-${Date.now()}-${i}` } });
        }
        if (!sender) {
          errors.push(`${rowLabel}: senderName and senderPhone required when sender is not an existing customer`);
          continue;
        }

        await this.create({
          description: row.description,
          weight: row.weight ? parseFloat(row.weight) : undefined,
          orderReference: row.orderReference,
          senderId: sender.id,
          recipientId: recipient.id,
          originAddress: { street: row.senderAddress || '', city: row.senderCity || '', state: row.senderState || '', country: row.country || 'NG', postalCode: '', landmark: '' },
          destinationAddress: { street: row.recipientAddress, city: row.destCity || '', state: row.destState || '', country: row.country || 'NG', postalCode: '', landmark: '' },
        }, createdById);
        success++;
      } catch (err: any) {
        errors.push(`${rowLabel}: ${err?.message ?? 'Unknown error'}`);
      }
    }

    return { success, failed: errors.length, errors };
  }

  async getSlaAlerts(slaHours = 4) {
    const cutoff = new Date(Date.now() - slaHours * 60 * 60 * 1000);
    const warningCutoff = new Date(Date.now() - (slaHours - 1) * 60 * 60 * 1000);

    const packages = await this.prisma.package.findMany({
      where: {
        status: { in: ['IN_TRANSIT', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DISPATCHED'] as any },
        updatedAt: { lte: warningCutoff },
      },
      include: {
        assignments: {
          where: { isActive: true },
          include: { rider: { include: { user: { select: { firstName: true, lastName: true } } } } },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });

    return packages.map((p) => {
      const hoursElapsed = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60);
      const rider = p.assignments[0]?.rider;
      return {
        id: p.id,
        trackingNumber: p.trackingNumber,
        status: p.status,
        destCity: p.destCity,
        hoursElapsed: Math.round(hoursElapsed * 10) / 10,
        slaHours,
        isBreached: hoursElapsed > slaHours,
        riderName: rider ? `${rider.user.firstName} ${rider.user.lastName}` : null,
      };
    });
  }

  async bulkUpdateStatus(packageIds: string[], status: string, performedById: string) {
    const updated = await this.prisma.$transaction(
      packageIds.map((id) =>
        this.prisma.package.update({
          where: { id },
          data: {
            status: status as any,
            statusHistory: {
              create: { status: status as any, performedById, isCustomerVisible: false },
            },
          },
        }),
      ),
    );
    return { ok: true, updated: updated.length };
  }

  async assignRider(packageId: string, riderId: string, assignedById: string, reason?: string) {
    const rider = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) throw new Error('Rider not found');

    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.assignment.findFirst({ where: { packageId, isActive: true } });
      if (previous) {
        await tx.assignment.update({ where: { id: previous.id }, data: { isActive: false, unassignedAt: new Date() } });
      }
      const assignment = await tx.assignment.create({
        data: { packageId, riderId, assignedById, reassignmentReason: reason, previousAssignmentId: previous?.id },
        include: { rider: { include: { user: true } } },
      });
      await tx.package.update({ where: { id: packageId }, data: { status: 'ASSIGNED' as any } });
      await tx.packageStatusEvent.create({
        data: { packageId, status: 'ASSIGNED' as any, note: reason, performedById: assignedById, isCustomerVisible: false },
      });
      return assignment;
    });
  }

  private async ensureUniqueTrackingNumber(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const tn = generateTrackingNumber();
      const existing = await this.findByTrackingNumber(tn);
      if (!existing) return tn;
    }
    throw new Error('Could not generate unique tracking number');
  }

  async getReconciliationPending(search?: string) {
    const where: any = { status: 'DELIVERED', receiptReconciled: false };
    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { recipient: { name: { contains: search, mode: 'insensitive' } } },
        { sender: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.package.findMany({
        where,
        include: {
          sender: { select: { name: true } },
          recipient: { select: { name: true } },
          assignments: {
            where: { isActive: false },
            orderBy: { assignedAt: 'desc' },
            take: 1,
            include: { rider: { include: { user: { select: { firstName: true, lastName: true } } } } },
          },
        },
        orderBy: { updatedAt: 'asc' },
        take: 100,
      }),
      this.prisma.package.count({ where }),
    ]);
    return { data, meta: { total } };
  }

  async reconcilePackage(packageId: string, performedById: string) {
    const pkg = await this.prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) throw new NotFoundException('Package not found');
    if (pkg.status !== 'DELIVERED') throw new Error('Only DELIVERED packages can be reconciled');
    if ((pkg as any).receiptReconciled) throw new Error('Package already reconciled');

    return this.prisma.package.update({
      where: { id: packageId },
      data: {
        receiptReconciled: true,
        receiptReconciledAt: new Date(),
      } as any,
    });
  }
}
