import { Injectable, BadRequestException } from '@nestjs/common';
import { PackageStatus } from '@cityrider/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DispatchService {
  constructor(private readonly prisma: PrismaService) {}

  async createManifest(packageIds: string[], riderId: string, createdById: string) {
    if (!packageIds.length) throw new BadRequestException('At least one package is required');

    const packages = await this.prisma.package.findMany({
      where: { id: { in: packageIds } },
      select: { id: true, status: true, trackingNumber: true },
    });

    if (packages.length !== packageIds.length) {
      throw new BadRequestException('One or more package IDs not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const manifest = await tx.dispatchManifest.create({
        data: { riderId, createdById },
        include: { rider: { include: { user: true } } },
      });

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
