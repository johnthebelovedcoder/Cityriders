import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(vehicleId?: string) {
    const records = await this.prisma.maintenance.findMany({
      where: vehicleId ? { vehicleId } : undefined,
      include: { vehicle: { select: { id: true, plateNumber: true, make: true, model: true } } },
      orderBy: { serviceDate: 'desc' },
    });
    const details = await this.prisma.$queryRaw<Array<{ id: string; component: string | null; replacementDate: Date | null }>>`SELECT "id", "component", "replacementDate" FROM "maintenance_records"`;
    const byId = new Map(details.map((detail) => [detail.id, detail]));
    return records.map((record) => ({ ...record, ...(byId.get(record.id) ?? {}) }));
  }

  async findOne(id: string) {
    const record = await this.prisma.maintenance.findUnique({
      where: { id },
      include: { vehicle: { select: { id: true, plateNumber: true, make: true, model: true } } },
    });
    if (!record) throw new NotFoundException('Maintenance record not found');
    const [details] = await this.prisma.$queryRaw<Array<{ component: string | null; replacementDate: Date | null }>>`SELECT "component", "replacementDate" FROM "maintenance_records" WHERE "id" = ${id}`;
    return { ...record, ...details };
  }

  async create(dto: any) {
    const record = await this.prisma.maintenance.create({
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
    await this.prisma.$executeRaw`UPDATE "maintenance_records" SET "component" = ${dto.component || null}, "replacementDate" = ${dto.replacementDate ? new Date(dto.replacementDate) : null} WHERE "id" = ${record.id}`;
    return { ...record, component: dto.component ?? null, replacementDate: dto.replacementDate ? new Date(dto.replacementDate) : null };
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    const record = await this.prisma.maintenance.update({
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
    if (dto.component !== undefined || dto.replacementDate !== undefined) {
      await this.prisma.$executeRaw`UPDATE "maintenance_records" SET "component" = CASE WHEN ${dto.component === undefined} THEN "component" ELSE ${dto.component || null} END, "replacementDate" = CASE WHEN ${dto.replacementDate === undefined} THEN "replacementDate" ELSE ${dto.replacementDate ? new Date(dto.replacementDate) : null} END WHERE "id" = ${id}`;
    }
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.maintenance.delete({ where: { id } });
  }

  async getAlerts() {
    const now = new Date();
    const soon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
    const [config] = await this.prisma.$queryRaw<Array<{ maintenanceReviewDays: number }>>`SELECT "maintenanceReviewDays" FROM "system_settings" WHERE "id" = 'default'`;
    const reviewDays = Number(config?.maintenanceReviewDays ?? 30);
    const cutoff = new Date(now.getTime() - reviewDays * 24 * 60 * 60 * 1000);
    const recent = await this.prisma.maintenance.findMany({
      where: { status: { not: 'CANCELLED' }, serviceDate: { gte: cutoff } },
      include: { vehicle: { select: { id: true, plateNumber: true, make: true, model: true } } },
      orderBy: { serviceDate: 'desc' },
    });
    const details = await this.prisma.$queryRaw<Array<{ id: string; component: string | null; replacementDate: Date | null }>>`SELECT "id", "component", "replacementDate" FROM "maintenance_records" WHERE "serviceDate" >= ${cutoff}`;
    const detailById = new Map(details.map((detail) => [detail.id, detail]));
    const enriched = recent.map((record) => ({ ...record, ...(detailById.get(record.id) ?? {}) }));
    const counts = new Map<string, number>();
    for (const record of enriched as any[]) {
      if (!record.component?.trim()) continue;
      const key = `${record.vehicleId}:${record.component.trim().toLowerCase()}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return enriched.map((record: any) => {
      const repeatedCount = record.component ? counts.get(`${record.vehicleId}:${record.component.trim().toLowerCase()}`) ?? 0 : 0;
      const dueSoon = !!record.nextServiceDate && record.nextServiceDate <= soon;
      const repeatMaintenance = repeatedCount > 1;
      return { ...record, dueSoon, repeatMaintenance, repeatedCount, alertReasons: [dueSoon ? 'Service due soon' : null, repeatMaintenance ? `Repeated ${record.component} work within ${reviewDays} days` : null].filter(Boolean) };
    }).filter((record: any) => record.dueSoon || record.repeatMaintenance);
  }
}
