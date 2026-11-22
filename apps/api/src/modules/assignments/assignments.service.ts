import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { status?: string; page?: number; limit?: number } = {}) {
    const { page = 1, limit = 25 } = query;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.assignment.findMany({
        skip,
        take: limit,
        where: query.status ? { package: { status: query.status as any } } : undefined,
        include: {
          package: { include: { sender: true, recipient: true } },
          rider: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
          assignedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { assignedAt: 'desc' },
      }),
      this.prisma.assignment.count({ where: query.status ? { package: { status: query.status as any } } : undefined }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async assign(packageId: string, riderId: string, assignedById: string, reason?: string) {
    const rider = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');
    if (rider.status !== 'ACTIVE') throw new BadRequestException('Cannot assign to an inactive rider');

    return this.prisma.$transaction(async (tx) => {
      // Deactivate current assignment if exists
      const previous = await tx.assignment.findFirst({ where: { packageId, isActive: true } });
      if (previous) {
        await tx.assignment.update({ where: { id: previous.id }, data: { isActive: false, unassignedAt: new Date() } });
      }

      // Create new assignment
      const assignment = await tx.assignment.create({
        data: {
          packageId, riderId, assignedById,
          reassignmentReason: reason,
          previousAssignmentId: previous?.id,
        },
        include: { rider: { include: { user: true } }, assignedBy: true },
      });

      // Update package status
      await tx.package.update({ where: { id: packageId }, data: { status: 'ASSIGNED' } });
      await tx.packageStatusEvent.create({
        data: { packageId, status: 'ASSIGNED', note: reason, performedById: assignedById, isCustomerVisible: false },
      });

      return assignment;
    });
  }

  async getAssignmentsForRider(riderId: string) {
    return this.prisma.assignment.findMany({
      where: { riderId, isActive: true },
      include: { package: { include: { sender: true, recipient: true } } },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async getHistory(packageId: string) {
    return this.prisma.assignment.findMany({
      where: { packageId },
      include: { rider: { include: { user: true } }, assignedBy: true },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async getConflicts() {
    // Find riders with 3+ active packages in transit simultaneously (simple overload heuristic)
    const activeAssignments = await this.prisma.assignment.findMany({
      where: {
        isActive: true,
        package: { status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DISPATCHED'] as any } },
      },
      include: {
        rider: { include: { user: { select: { firstName: true, lastName: true } } } },
        package: { select: { id: true, trackingNumber: true, destCity: true, updatedAt: true } },
      },
    });

    const riderMap = new Map<string, { riderName: string; riderId: string; packages: any[] }>();
    for (const a of activeAssignments) {
      const key = a.riderId;
      if (!riderMap.has(key)) {
        riderMap.set(key, {
          riderId: a.riderId,
          riderName: `${a.rider.user.firstName} ${a.rider.user.lastName}`,
          packages: [],
        });
      }
      riderMap.get(key)!.packages.push({
        id: a.package.id,
        trackingNumber: a.package.trackingNumber,
        deliveryWindow: a.package.destCity,
      });
    }

    return [...riderMap.values()]
      .filter((r) => r.packages.length >= 3)
      .map((r) => ({ riderId: r.riderId, riderName: r.riderName, conflictPackages: r.packages }));
  }

  async optimizeRoute(packageId: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
      include: { sender: true, recipient: true },
    });
    if (!pkg) throw new NotFoundException('Package not found');

    // Active riders with zone info
    const riders = await this.prisma.rider.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
        zone: true,
        assignments: {
          where: { isActive: true, package: { status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] as any } } },
          select: { id: true },
        },
      },
    });

    const destCity = pkg.destCity?.toLowerCase() ?? '';

    const scored = riders.map((rider) => {
      const riderName = `${rider.user.firstName} ${rider.user.lastName}`;
      const activeLoad = rider.assignments.length;

      // Zone match: does rider's zone name include the dest city or vice versa?
      const zoneName = rider.zone?.name?.toLowerCase() ?? '';
      const zoneMatch =
        (zoneName && destCity && (zoneName.includes(destCity) || destCity.includes(zoneName))) ? 2 : 0;

      // Load score: prefer riders with fewer active assignments (max boost at 0 load)
      const loadScore = Math.max(0, 5 - activeLoad);

      return {
        riderId: rider.id,
        riderName,
        zoneId: rider.zoneId,
        zoneName: rider.zone?.name ?? null,
        activeLoad,
        score: zoneMatch + loadScore,
        recommended: false,
      };
    });

    // Sort: higher score = better; ties broken by least load
    scored.sort((a, b) => b.score - a.score || a.activeLoad - b.activeLoad);

    if (scored.length > 0) scored[0]!.recommended = true;

    return {
      packageId: pkg.id,
      trackingNumber: pkg.trackingNumber,
      destCity: pkg.destCity,
      suggestions: scored.slice(0, 5),
    };
  }
}
