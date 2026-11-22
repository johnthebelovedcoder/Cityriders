import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async getActive() {
    const activeStatuses = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DISPATCHED', 'COLLECTED'];
    const packages = await this.prisma.package.findMany({
      where: { status: { in: activeStatuses as any } },
      select: {
        id: true,
        trackingNumber: true,
        status: true,
        destCity: true,
        originCity: true,
        assignments: {
          where: { isActive: true },
          select: {
            rider: {
              select: {
                latitude: true,
                longitude: true,
                lastLocationAt: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    return packages.map((p) => {
      const rider = p.assignments[0]?.rider;
      return {
        id: p.id,
        packageId: p.id,
        trackingNumber: p.trackingNumber,
        status: p.status,
        riderName: rider ? `${rider.user.firstName} ${rider.user.lastName}` : 'Unassigned',
        origin: p.originCity || 'Unknown',
        destination: p.destCity || 'Unknown',
        lastUpdate: p.statusHistory[0]?.createdAt ?? new Date(),
        lat: rider?.latitude ?? null,
        lng: rider?.longitude ?? null,
      };
    });
  }

  async track(trackingNumber: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { trackingNumber: trackingNumber.toUpperCase() },
      select: {
        trackingNumber: true,
        status: true,
        description: true,
        destCity: true,
        destCountry: true,
        createdAt: true,
        // Public-safe status events only
        statusHistory: {
          where: { isCustomerVisible: true },
          select: { status: true, note: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!pkg) throw new NotFoundException('Tracking number not found');
    return pkg;
  }

  async submitDispute(trackingNumber: string, dto: { reason: string; description: string; contact?: string }) {
    const pkg = await this.prisma.package.findUnique({
      where: { trackingNumber: trackingNumber.toUpperCase() },
      select: { id: true, status: true, internalNotes: true },
    });

    if (!pkg) throw new NotFoundException('Tracking number not found');
    if (pkg.status !== 'DELIVERED' as any) {
      throw new BadRequestException('Disputes can only be raised on delivered packages');
    }

    const note = `Dispute: reason=${dto.reason}, contact=${dto.contact ?? 'not provided'} — "${dto.description}" (submitted ${new Date().toISOString()})`;
    await this.prisma.package.update({
      where: { id: pkg.id },
      data: { internalNotes: pkg.internalNotes ? `${pkg.internalNotes}\n${note}` : note },
    });

    return { ok: true, message: 'Dispute submitted successfully' };
  }

  async requestReschedule(trackingNumber: string, dto: { preferredDate: string; notes?: string }) {
    const pkg = await this.prisma.package.findUnique({
      where: { trackingNumber: trackingNumber.toUpperCase() },
      select: { id: true, status: true, internalNotes: true },
    });

    if (!pkg) throw new NotFoundException('Tracking number not found');
    if (pkg.status !== 'DELIVERY_ATTEMPTED' as any) {
      throw new BadRequestException('Rescheduling is only available after a failed delivery attempt');
    }

    const note = `Reschedule request: preferred date ${dto.preferredDate}${dto.notes ? ` — "${dto.notes}"` : ''} (submitted ${new Date().toISOString()})`;
    await this.prisma.package.update({
      where: { id: pkg.id },
      data: {
        reattemptAt: new Date(dto.preferredDate),
        internalNotes: pkg.internalNotes ? `${pkg.internalNotes}\n${note}` : note,
      },
    });

    return { ok: true, message: 'Rescheduling request received' };
  }
}
