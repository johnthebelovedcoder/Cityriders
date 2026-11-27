import { Injectable, BadRequestException } from '@nestjs/common';
import { PackageStatus } from '@cityrider/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DispatchService {
  constructor(private readonly prisma: PrismaService) {}

  async createManifest(packageIds: string[], riderId: string, createdById: string, expectedPackageCount?: number) {
    if (!packageIds.length) throw new BadRequestException('At least one package is required');
    if (new Set(packageIds).size !== packageIds.length) throw new BadRequestException('A package can only appear once in a manifest');
    if (expectedPackageCount !== undefined && expectedPackageCount !== packageIds.length) {
      throw new BadRequestException(`Expected ${expectedPackageCount} packages but received ${packageIds.length}; reconcile the discrepancy before dispatch`);
    }

    const rider = await this.prisma.rider.findUnique({ where: { id: riderId }, select: { id: true, status: true } });
    if (!rider || rider.status !== 'ACTIVE') throw new BadRequestException('An active rider is required for dispatch');

    const packages = await this.prisma.package.findMany({
      where: { id: { in: packageIds } },
      select: { id: true, status: true, trackingNumber: true, toZoneId: true },
    });

    if (packages.length !== packageIds.length) {
      throw new BadRequestException('One or more package IDs not found');
    }
    // Check every selected package with parameterized queries; raw querying avoids depending on a locked generated client.
    const blockedOrders = await Promise.all(packageIds.map((packageId) => this.prisma.$queryRaw<any[]>`
      SELECT 1 FROM "packages" p JOIN "customer_orders" o ON o."id" = p."customerOrderId"
      WHERE p."id" = ${packageId} AND o."status" <> 'RECONCILED' LIMIT 1
    `));
    if (blockedOrders.some((rows) => rows.length > 0)) {
      throw new BadRequestException('Reconcile the customer order intake before dispatching its packages');
    }
    const notReady = packages.filter((pkg) => !['SORTED', 'ASSIGNED'].includes(pkg.status) || !pkg.toZoneId);
    if (notReady.length) throw new BadRequestException('Every package must be sorted and have a route before dispatch');
    if (new Set(packages.map((pkg) => pkg.toZoneId)).size > 1) {
      throw new BadRequestException('Create a separate dispatch manifest for each route');
    }
    const assignments = await this.prisma.assignment.findMany({
      where: { packageId: { in: packageIds }, isActive: true },
      select: { packageId: true },
    });
    const activePackageIds = new Set(assignments.map((assignment) => assignment.packageId));
    const assignedElsewhere = await this.prisma.assignment.findFirst({
      where: { packageId: { in: packageIds }, isActive: true, riderId: { not: riderId } },
      select: { packageId: true },
    });
    if (assignedElsewhere) throw new BadRequestException('A selected package is already assigned to another rider');

    const alreadyAssignedToRider = await this.prisma.assignment.findMany({
      where: { packageId: { in: packageIds }, riderId, isActive: true },
      select: { packageId: true },
    });
    const assignedIds = new Set(alreadyAssignedToRider.map((assignment) => assignment.packageId));
    if ([...activePackageIds].some((packageId) => !assignedIds.has(packageId))) {
      throw new BadRequestException('A selected package already has an active assignment');
    }

    return this.prisma.$transaction(async (tx) => {
      const manifest = await tx.dispatchManifest.create({
        data: { riderId, createdById, expectedPackageCount: expectedPackageCount ?? packageIds.length, actualPackageCount: packageIds.length },
        include: { rider: { include: { user: true } } },
      });

      const unassignedPackageIds = packageIds.filter((packageId) => !activePackageIds.has(packageId));
      if (unassignedPackageIds.length) {
        await tx.assignment.createMany({
          data: unassignedPackageIds.map((packageId) => ({ packageId, riderId, assignedById: createdById })),
        });
        await tx.packageStatusEvent.createMany({
          data: unassignedPackageIds.map((packageId) => ({
            packageId,
            status: PackageStatus.ASSIGNED,
            performedById: createdById,
            isCustomerVisible: true,
          })),
        });
      }

      await tx.package.updateMany({
        where: { id: { in: packageIds } },
        data: { status: PackageStatus.DISPATCHED, manifestId: manifest.id },
      });

      await tx.packageStatusEvent.createMany({
        data: packageIds.map((packageId) => ({
          packageId,
          status: PackageStatus.DISPATCHED,
          performedById: createdById,
          isCustomerVisible: true,
        })),
      });

      return { ...manifest, packageCount: packageIds.length, packageIds };
    });
  }

  findAll() {
    return this.prisma.dispatchManifest.findMany({
      include: {
        rider: { include: { user: { select: { firstName: true, lastName: true } } } },
        packages: { select: { id: true, trackingNumber: true, status: true, destStreet: true, destCity: true } },
      },
      orderBy: { dispatchedAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.dispatchManifest.findUniqueOrThrow({
      where: { id },
      include: {
        rider: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
        packages: {
          include: {
            recipient: { select: { name: true, phone: true, deliveryAddress: true } },
          },
        },
      },
    });
  }
}
