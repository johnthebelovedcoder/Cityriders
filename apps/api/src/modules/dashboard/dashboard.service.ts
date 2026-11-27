import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecentActivity() {
    const events = await this.prisma.packageStatusEvent.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        packageId: true,
        package: { select: { trackingNumber: true } },
      },
    });
    return events.map((event) => ({
      id: event.id,
      type: event.status,
      time: event.createdAt,
      packageId: event.packageId,
      message: `${event.package.trackingNumber} status changed to ${String(event.status).replaceAll('_', ' ').toLowerCase()}`,
    }));
  }

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalPackages,
      activeDeliveries,
      completedToday,
      activeRiders,
      recentPackages,
    ] = await Promise.all([
      this.prisma.package.count(),
      this.prisma.package.count({
        where: { status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERY_ATTEMPTED'] } },
      }),
      this.prisma.package.count({
        where: { status: 'DELIVERED', updatedAt: { gte: todayStart } },
      }),
      this.prisma.rider.count({ where: { status: 'ACTIVE' } }),
      this.prisma.package.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          trackingNumber: true,
          status: true,
          createdAt: true,
          destCity: true,
          sender: { select: { name: true } },
          recipient: { select: { name: true } },
        },
      }),
    ]);

    return { totalPackages, activeDeliveries, completedToday, activeRiders, recentPackages };
  }
}
