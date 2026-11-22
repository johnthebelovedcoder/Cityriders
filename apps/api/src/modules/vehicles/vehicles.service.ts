import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.vehicle.findMany({
      where: search
        ? {
            OR: [
              { plateNumber: { contains: search, mode: 'insensitive' } },
              { make: { contains: search, mode: 'insensitive' } },
              { model: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        assignedRider: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const v = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        assignedRider: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!v) throw new NotFoundException(`Vehicle ${id} not found`);
    return v;
  }

  create(dto: {
    plateNumber: string;
    make: string;
    model: string;
    year: number;
    type: string;
    assignedRiderId?: string;
    insuranceExpiry?: string;
    inspectionExpiry?: string;
    odometerKm?: number;
    notes?: string;
  }) {
    return this.prisma.vehicle.create({
      data: {
        ...dto,
        year: Number(dto.year),
        odometerKm: dto.odometerKm ? Number(dto.odometerKm) : 0,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
        inspectionExpiry: dto.inspectionExpiry ? new Date(dto.inspectionExpiry) : undefined,
      },
    });
  }

  async update(
    id: string,
    dto: Partial<{
      plateNumber: string;
      make: string;
      model: string;
      year: number;
      type: string;
      status: string;
      assignedRiderId: string | null;
      insuranceExpiry: string | null;
      inspectionExpiry: string | null;
      odometerKm: number;
      notes: string;
    }>,
  ) {
    await this.findOne(id);
    const { insuranceExpiry, inspectionExpiry, year, odometerKm, ...rest } = dto;
    return this.prisma.vehicle.update({
      where: { id },
      data: {
        ...rest,
        ...(year !== undefined && { year: Number(year) }),
        ...(odometerKm !== undefined && { odometerKm: Number(odometerKm) }),
        ...(insuranceExpiry !== undefined && {
          insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        }),
        ...(inspectionExpiry !== undefined && {
          inspectionExpiry: inspectionExpiry ? new Date(inspectionExpiry) : null,
        }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vehicle.delete({ where: { id } });
  }
}
