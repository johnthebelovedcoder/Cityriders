import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(vehicleId?: string) {
    return this.prisma.maintenance.findMany({
      where: vehicleId ? { vehicleId } : undefined,
      include: { vehicle: { select: { id: true, plateNumber: true, make: true, model: true } } },
      orderBy: { serviceDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.maintenance.findUnique({
      where: { id },
      include: { vehicle: { select: { id: true, plateNumber: true, make: true, model: true } } },
    });
    if (!record) throw new NotFoundException('Maintenance record not found');
    return record;
  }

  create(dto: any) {
    return this.prisma.maintenance.create({
      data: {
        vehicleId: dto.vehicleId,
        type: dto.type,
        description: dto.description || undefined,
        cost: dto.cost ? Number(dto.cost) : undefined,
        mileageAtService: dto.mileageAtService ? Number(dto.mileageAtService) : undefined,
        serviceDate: new Date(dto.serviceDate),
        nextServiceDate: dto.nextServiceDate ? new Date(dto.nextServiceDate) : undefined,
        nextServiceMileage: dto.nextServiceMileage ? Number(dto.nextServiceMileage) : undefined,
        performedBy: dto.performedBy || undefined,
        status: dto.status || 'COMPLETED',
        notes: dto.notes || undefined,
      },
      include: { vehicle: { select: { id: true, plateNumber: true, make: true, model: true } } },
    });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.maintenance.update({
      where: { id },
      data: {
        ...(dto.type && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.cost !== undefined && { cost: dto.cost ? Number(dto.cost) : null }),
        ...(dto.mileageAtService !== undefined && { mileageAtService: dto.mileageAtService ? Number(dto.mileageAtService) : null }),
        ...(dto.serviceDate && { serviceDate: new Date(dto.serviceDate) }),
        ...(dto.nextServiceDate !== undefined && { nextServiceDate: dto.nextServiceDate ? new Date(dto.nextServiceDate) : null }),
        ...(dto.nextServiceMileage !== undefined && { nextServiceMileage: dto.nextServiceMileage ? Number(dto.nextServiceMileage) : null }),
        ...(dto.performedBy !== undefined && { performedBy: dto.performedBy }),
        ...(dto.status && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.maintenance.delete({ where: { id } });
  }

  async getAlerts() {
    const now = new Date();
    const soon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
    return this.prisma.maintenance.findMany({
      where: {
        status: { not: 'CANCELLED' },
        nextServiceDate: { lte: soon },
      },
      include: { vehicle: { select: { id: true, plateNumber: true, make: true, model: true } } },
      orderBy: { nextServiceDate: 'asc' },
    });
  }
}
