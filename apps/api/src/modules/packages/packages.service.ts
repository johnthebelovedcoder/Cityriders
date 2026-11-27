import { Injectable, NotFoundException, Optional, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import { generateTrackingNumber } from '@cityrider/utils';
import { PackageStatus } from '@cityrider/types';

import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { TrackingGateway } from '../tracking/tracking.gateway';

// Keep this table as strings so stale compiled @cityrider/types declarations
// cannot reject phase-two statuses that are already present in the database.
const PACKAGE_TRANSITIONS: Record<string, string[]> = {
  REGISTERED: ['COLLECTED', 'RECEIVED_AT_OFFICE', 'ON_HOLD', 'CANCELLED'],
  PENDING: ['COLLECTED', 'RECEIVED_AT_OFFICE', 'ON_HOLD', 'CANCELLED'],
  AWAITING_ASSIGNMENT: ['COLLECTED', 'RECEIVED_AT_OFFICE', 'ON_HOLD', 'CANCELLED'],
  COLLECTED: ['RECEIVED_AT_OFFICE', 'ON_HOLD', 'CANCELLED'],
  PICKED_UP: ['RECEIVED_AT_OFFICE', 'IN_TRANSIT', 'ON_HOLD', 'CANCELLED'],
  RECEIVED_AT_OFFICE: ['SORTED', 'ON_HOLD', 'CANCELLED'],
  SORTED: ['ASSIGNED', 'ON_HOLD', 'CANCELLED'],
  ASSIGNED: ['DISPATCHED', 'PICKED_UP', 'ON_HOLD', 'CANCELLED'],
  DISPATCHED: ['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'ON_HOLD'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'FAILED', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERY_ATTEMPTED', 'FAILED', 'DELIVERED'],
  DELIVERY_ATTEMPTED: ['RESCHEDULED', 'RETURNED', 'CANCELLED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT'],
  FAILED: ['RESCHEDULED', 'RETURNED', 'CANCELLED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT'],
  RESCHEDULED: ['ASSIGNED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  ON_HOLD: ['COLLECTED', 'RECEIVED_AT_OFFICE', 'SORTED', 'ASSIGNED', 'DISPATCHED', 'CANCELLED'],
};

@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    @Optional() private readonly trackingGateway?: TrackingGateway,
  ) {}

  async findAll(query: { status?: string; search?: string; customerId?: string; from?: string; to?: string; page?: number; limit?: number } = {}) {
    const { status, search, customerId, from, to, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.senderId = customerId;
    if (from || to) where.createdAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}) };
    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { orderReference: { contains: search, mode: 'insensitive' } },
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

  listOrders(status?: string) {
    return this.prisma.$queryRaw<any[]>`
      SELECT o."id", o."customerReference", o."expectedPackageCount", o."receivedPackageCount", o."status", o."discrepancyNote", o."reconciledAt", o."createdAt", o."pickupLocationId", o."collectedAt", o."officeReceivedAt", o."serviceDate", c."id" AS "customerId", c."name" AS "customerName"
      FROM "customer_orders" o JOIN "customers" c ON c."id" = o."customerId"
      WHERE (${status ?? null}::text IS NULL OR o."status"::text = ${status ?? null})
      ORDER BY o."createdAt" DESC
    `.then(async (orders) => {
      if (!orders.length) return [];
      return Promise.all(orders.map(async (order) => {
        const [packages, pickupLocations] = await Promise.all([
          this.prisma.$queryRaw<any[]>`SELECT "id", "trackingNumber", "status" FROM "packages" WHERE "customerOrderId" = ${order.id}`,
          this.prisma.$queryRaw<any[]>`SELECT "id", "label", "address", "city" FROM "customer_pickup_locations" WHERE "customerId" = ${order.customerId} ORDER BY "isDefault" DESC, "label" ASC`,
        ]);
        return { ...order, customer: { id: order.customerId, name: order.customerName }, packages, pickupLocations };
      }));
    });
  }

  async recordOrderCollection(id: string, input: { pickupLocationId?: string }, performedById: string) {
    const [order] = await this.prisma.$queryRaw<any[]>`SELECT * FROM "customer_orders" WHERE "id" = ${id} LIMIT 1`;
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    if (input.pickupLocationId) {
      const [location] = await this.prisma.$queryRaw<any[]>`SELECT "id" FROM "customer_pickup_locations" WHERE "id" = ${input.pickupLocationId} AND "customerId" = ${order.customerId}`;
      if (!location) throw new BadRequestException('Pickup location does not belong to this customer');
    }
    const [updated] = await this.prisma.$queryRaw<any[]>`
      UPDATE "customer_orders" SET "pickupLocationId" = ${input.pickupLocationId ?? order.pickupLocationId}, "collectedAt" = CURRENT_TIMESTAMP,
        "collectedById" = ${performedById}, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id} RETURNING *
    `;
    this.audit.log({ userId: performedById, action: 'UPDATE', entity: 'CustomerOrder', entityId: id, previousValue: { collectedAt: order.collectedAt, pickupLocationId: order.pickupLocationId }, newValue: { collectedAt: updated.collectedAt, pickupLocationId: updated.pickupLocationId } }).catch(() => void 0);
    return updated;
  }

  async reconcileOrder(id: string, input: { expectedPackageCount: number; receivedPackageCount?: number; discrepancyNote?: string }, performedById: string) {
    const [order] = await this.prisma.$queryRaw<any[]>`SELECT * FROM "customer_orders" WHERE "id" = ${id} LIMIT 1`;
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    const actual = input.receivedPackageCount ?? order.receivedPackageCount;
    if (!Number.isInteger(input.expectedPackageCount) || input.expectedPackageCount < 0 || !Number.isInteger(actual) || actual < 0) {
      throw new BadRequestException('Expected and received package counts must be non-negative integers');
    }
    const reconciled = actual === input.expectedPackageCount;
    if (!reconciled && !input.discrepancyNote?.trim()) {
      throw new BadRequestException('Add a note describing the intake discrepancy');
    }
    const [updated] = await this.prisma.$queryRaw<any[]>`
      UPDATE "customer_orders" SET "expectedPackageCount" = ${input.expectedPackageCount},
        "receivedPackageCount" = ${actual}, "officeReceivedAt" = COALESCE("officeReceivedAt", CURRENT_TIMESTAMP),
        "officeReceivedById" = COALESCE("officeReceivedById", ${performedById}),
        "discrepancyNote" = ${reconciled ? null : input.discrepancyNote!.trim()},
        "status" = ${reconciled ? 'RECONCILED' : 'RECEIVING'}::"CustomerOrderStatus",
        "reconciledAt" = ${reconciled ? new Date() : null}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id} RETURNING *
    `;
    const [customer] = await this.prisma.$queryRaw<any[]>`SELECT "id", "name" FROM "customers" WHERE "id" = ${updated.customerId}`;
    this.audit.log({ userId: performedById, action: 'UPDATE', entity: 'CustomerOrder', entityId: id, previousValue: { status: order.status, expectedPackageCount: order.expectedPackageCount }, newValue: { status: updated.status, expectedPackageCount: updated.expectedPackageCount, receivedPackageCount: updated.receivedPackageCount, discrepancyNote: updated.discrepancyNote } }).catch(() => void 0);
    const packages = await this.prisma.$queryRaw<any[]>`SELECT "id", "trackingNumber", "status" FROM "packages" WHERE "customerOrderId" = ${id}`;
    return { ...updated, customer, packages };
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
    if (dto.expectedPackageCount != null && (!Number.isInteger(Number(dto.expectedPackageCount)) || Number(dto.expectedPackageCount) < 0)) {
      throw new BadRequestException('Expected package count must be a non-negative integer');
    }
    const trackingNumber = await this.ensureUniqueTrackingNumber();
    const autoFee = dto.deliveryFee == null
      ? await this.calcDeliveryFee(dto.fromZoneId, dto.toZoneId, dto.weight)
      : undefined;

    const { pkg, recipient } = await this.prisma.$transaction(async (tx) => {
      let customerOrderId: string | undefined;
      const customerReference = dto.orderReference?.trim();
      if (customerReference) {
        const expectedCount = dto.expectedPackageCount == null ? null : Number(dto.expectedPackageCount);
        const [order] = await tx.$queryRaw<any[]>`
          INSERT INTO "customer_orders" ("id", "customerId", "customerReference", "expectedPackageCount", "receivedPackageCount", "status", "createdById", "officeReceivedAt", "officeReceivedById", "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, ${dto.senderId}, ${customerReference}, ${expectedCount}, 1, 'RECEIVING', ${createdById}, CURRENT_TIMESTAMP, ${createdById}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT ("customerId", "customerReference") DO UPDATE SET
            "receivedPackageCount" = customer_orders."receivedPackageCount" + 1,
            "expectedPackageCount" = COALESCE(EXCLUDED."expectedPackageCount", customer_orders."expectedPackageCount"),
            "status" = 'RECEIVING', "reconciledAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
          RETURNING "id"
        `;
        customerOrderId = order.id;
      }
      const created = await tx.package.create({
        data: {
          trackingNumber,
          orderReference: customerReference,
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

      if (customerOrderId) {
        await tx.$executeRaw`UPDATE "packages" SET "customerOrderId" = ${customerOrderId} WHERE "id" = ${created.id}`;
      }

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
    let failureReasonCodeId: string | undefined;

    if (!PACKAGE_TRANSITIONS[previous]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${previous} to ${status}`);
    }
    if (status === PackageStatus.DELIVERY_ATTEMPTED || status === PackageStatus.FAILED) {
      if (!opts?.failureReasonCodeId) throw new BadRequestException('A failure reason is required for an unsuccessful delivery');
      const reason = await this.prisma.failureReasonCode.findFirst({
        where: { id: opts.failureReasonCodeId, isActive: true },
      });
      if (!reason) throw new BadRequestException('Select an active failure reason');
      failureReasonCodeId = reason.id;
      if (reason.code.toUpperCase() === 'OTHER' && !note?.trim()) {
        throw new BadRequestException('Add a note when selecting Other as the failure reason');
      }
    }

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
      if (status === PackageStatus.DELIVERY_ATTEMPTED || status === PackageStatus.FAILED || status === PackageStatus.DELIVERED) {
        const assignment = await tx.assignment.findFirst({ where: { packageId: id, isActive: true }, select: { riderId: true } });
        if (!assignment) throw new BadRequestException('A delivery attempt requires an active rider assignment');
        await tx.deliveryAttempt.create({
          data: {
            packageId: id,
            riderId: assignment.riderId,
            outcome: status,
            failureReasonCodeId,
            note,
          },
        });
      }
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

  async correctDeliveredOutcome(id: string, correctedStatus: string, reason: string, correctedById: string) {
    const allowed = ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'FAILED', 'RESCHEDULED', 'RETURNED'];
    if (!allowed.includes(correctedStatus)) throw new BadRequestException('Select a valid corrected delivery status');
    if (!reason?.trim()) throw new BadRequestException('A correction reason is required');
    const pkg = await this.prisma.package.findUnique({ where: { id }, select: { id: true, status: true, trackingNumber: true } });
    if (!pkg) throw new NotFoundException(`Package ${id} not found`);
    if (pkg.status !== 'DELIVERED') throw new BadRequestException('Only delivered packages can use the delivery correction process');
    await this.prisma.$transaction(async (tx) => {
      await tx.package.update({ where: { id }, data: { status: correctedStatus as any } });
      await tx.packageStatusEvent.create({ data: { packageId: id, status: correctedStatus as any, note: `Authorized delivery correction: ${reason.trim()}`, performedById: correctedById, isCustomerVisible: true } });
      await tx.$executeRaw`INSERT INTO "delivery_outcome_corrections" ("id", "packageId", "correctedById", "previousStatus", "correctedStatus", "reason", "createdAt") VALUES (${randomUUID()}, ${id}, ${correctedById}, 'DELIVERED'::"PackageStatus", ${correctedStatus}::"PackageStatus", ${reason.trim()}, CURRENT_TIMESTAMP)`;
    });
    this.audit.log({ userId: correctedById, action: 'STATUS_CHANGE', entity: 'Package', entityId: id, previousValue: { status: 'DELIVERED' }, newValue: { status: correctedStatus, correctionReason: reason.trim() } }).catch(() => void 0);
    return { success: true, id, trackingNumber: pkg.trackingNumber, previousStatus: 'DELIVERED', status: correctedStatus };
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
