import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    let settings = await this.prisma.systemSettings.findUnique({
      where: { id: 'default' },
      include: {
        zones: {
          include: { riders: { include: { user: { select: { firstName: true, lastName: true } } } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: { id: 'default' },
        include: {
          zones: {
            include: {
              riders: {
                include: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      });
    }
    const [config] = await this.prisma.$queryRaw<Array<{ maxPackagesPerRider: number; maintenanceReviewDays: number; bankName: string | null; accountNumber: string | null; accountName: string | null; invoicePaymentTermsDays: number; invoiceFooterNote: string | null; notificationRules: any }>>`SELECT "maxPackagesPerRider", "maintenanceReviewDays", "bankName", "accountNumber", "accountName", "invoicePaymentTermsDays", "invoiceFooterNote", "notificationRules" FROM "system_settings" WHERE "id" = 'default'`;
    const zones = await this.prisma.$queryRaw<Array<{ id: string; description: string | null; coverageAreas: string[]; isActive: boolean }>>`SELECT "id", "description", "coverageAreas", "isActive" FROM "zones"`;
    const zoneDetails = new Map(zones.map((zone) => [zone.id, zone]));
    return {
      ...settings,
      ...config,
      zones: settings.zones.map((zone) => ({ ...zone, ...(zoneDetails.get(zone.id) ?? {}) })),
    };
  }

  update(dto: Partial<{
    companyName: string; address: string; phone: string; email: string; currency: string;
    flatDeliveryFee: number; weightSurcharge: number; expenseApprovalThreshold: number;
    lowCreditThreshold: number; smsEnabled: boolean; vatRate: number;
    maxPackagesPerRider: number; maintenanceReviewDays: number; notificationRules: Record<string, unknown>;
    bankName: string; accountNumber: string; accountName: string; invoicePaymentTermsDays: number; invoiceFooterNote: string;
  }>) {
    if (dto.vatRate !== undefined && (!Number.isFinite(Number(dto.vatRate)) || Number(dto.vatRate) < 0 || Number(dto.vatRate) > 1)) {
      throw new BadRequestException('VAT rate must be between 0 and 1');
    }
    if (dto.maxPackagesPerRider !== undefined && (!Number.isInteger(Number(dto.maxPackagesPerRider)) || Number(dto.maxPackagesPerRider) < 1)) throw new BadRequestException('Rider package capacity must be a positive integer');
    if (dto.maintenanceReviewDays !== undefined && (!Number.isInteger(Number(dto.maintenanceReviewDays)) || Number(dto.maintenanceReviewDays) < 1)) throw new BadRequestException('Maintenance review window must be a positive number of days');
    const legacyData: any = { ...dto };
    delete legacyData.maxPackagesPerRider;
    delete legacyData.maintenanceReviewDays;
    delete legacyData.bankName;
    delete legacyData.accountNumber;
    delete legacyData.accountName;
    delete legacyData.invoicePaymentTermsDays;
    delete legacyData.invoiceFooterNote;
    delete legacyData.notificationRules;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.systemSettings.update({
      where: { id: 'default' },
      data: legacyData,
      include: { zones: true },
      });
      if (dto.maxPackagesPerRider !== undefined || dto.maintenanceReviewDays !== undefined || dto.bankName !== undefined || dto.accountNumber !== undefined || dto.accountName !== undefined || dto.invoicePaymentTermsDays !== undefined || dto.invoiceFooterNote !== undefined || dto.notificationRules !== undefined) {
        await tx.$executeRaw`UPDATE "system_settings" SET
          "maxPackagesPerRider" = COALESCE(${dto.maxPackagesPerRider ?? null}, "maxPackagesPerRider"),
          "maintenanceReviewDays" = COALESCE(${dto.maintenanceReviewDays ?? null}, "maintenanceReviewDays"),
          "bankName" = COALESCE(${dto.bankName ?? null}, "bankName"),
          "accountNumber" = COALESCE(${dto.accountNumber ?? null}, "accountNumber"),
          "accountName" = COALESCE(${dto.accountName ?? null}, "accountName"),
          "invoicePaymentTermsDays" = COALESCE(${dto.invoicePaymentTermsDays ?? null}, "invoicePaymentTermsDays"),
          "invoiceFooterNote" = COALESCE(${dto.invoiceFooterNote ?? null}, "invoiceFooterNote"),
          "notificationRules" = COALESCE(${dto.notificationRules === undefined ? null : JSON.stringify(dto.notificationRules)}::jsonb, "notificationRules")
          WHERE "id" = 'default'`;
      }
      return { ...updated, ...(await tx.$queryRaw<Array<{ maxPackagesPerRider: number; maintenanceReviewDays: number; bankName: string | null; accountNumber: string | null; accountName: string | null; invoicePaymentTermsDays: number; invoiceFooterNote: string | null; notificationRules: any }>>`SELECT "maxPackagesPerRider", "maintenanceReviewDays", "bankName", "accountNumber", "accountName", "invoicePaymentTermsDays", "invoiceFooterNote", "notificationRules" FROM "system_settings" WHERE "id" = 'default'`)[0] };
    });
  }

  addZone(data: { name: string; basePrice: number; description?: string; coverageAreas?: string[] }) {
    const { description, coverageAreas, ...base } = data;
    return this.prisma.$transaction(async (tx) => {
      const zone = await tx.zone.create({ data: { settingsId: 'default', ...base } });
      await tx.$executeRaw`UPDATE "zones" SET "description" = ${description ?? null}, "coverageAreas" = ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(coverageAreas ?? [])}::jsonb)) WHERE "id" = ${zone.id}`;
      return { ...zone, description: description ?? null, coverageAreas: coverageAreas ?? [], isActive: true };
    });
  }

  updateZone(id: string, dto: { name?: string; basePrice?: number; description?: string; coverageAreas?: string[]; isActive?: boolean }) {
    const { description, coverageAreas, isActive, ...base } = dto;
    return this.prisma.$transaction(async (tx) => {
      const zone = await tx.zone.update({ where: { id }, data: base });
      await tx.$executeRaw`UPDATE "zones" SET "description" = COALESCE(${description ?? null}, "description"), "coverageAreas" = CASE WHEN ${coverageAreas === undefined} THEN "coverageAreas" ELSE ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(coverageAreas ?? [])}::jsonb)) END, "isActive" = COALESCE(${isActive ?? null}, "isActive") WHERE "id" = ${id}`;
      const [details] = await tx.$queryRaw<Array<{ description: string | null; coverageAreas: string[]; isActive: boolean }>>`SELECT "description", "coverageAreas", "isActive" FROM "zones" WHERE "id" = ${id}`;
      return { ...zone, ...details };
    });
  }

  deleteZone(id: string) {
    return this.prisma.$executeRaw`UPDATE "zones" SET "isActive" = FALSE WHERE "id" = ${id}`;
  }

  getExpenseCategories() {
    return this.prisma.$queryRaw<Array<{ code: string; label: string; isActive: boolean }>>`SELECT "code"::text AS "code", "label", "isActive" FROM "expense_category_options" ORDER BY "label"`;
  }

  async updateExpenseCategory(code: string, input: { label?: string; isActive?: boolean }) {
    const [updated] = await this.prisma.$queryRaw<Array<{ code: string; label: string; isActive: boolean }>>`
      UPDATE "expense_category_options" SET "label" = COALESCE(${input.label ?? null}, "label"), "isActive" = COALESCE(${input.isActive ?? null}, "isActive"), "updatedAt" = CURRENT_TIMESTAMP
      WHERE "code"::text = ${code} RETURNING "code"::text AS "code", "label", "isActive"
    `;
    if (!updated) throw new BadRequestException('Expense category not found');
    return updated;
  }

  getFailureReasonCodes() {
    return this.prisma.failureReasonCode.findMany({ orderBy: { label: 'asc' } });
  }

  createFailureReasonCode(data: { code: string; label: string; description?: string }) {
    return this.prisma.failureReasonCode.create({ data: { ...data, isActive: true } });
  }

  updateFailureReasonCode(id: string, data: { label?: string; description?: string; isActive?: boolean }) {
    return this.prisma.failureReasonCode.update({ where: { id }, data });
  }

  deleteFailureReasonCode(id: string) {
    return this.prisma.failureReasonCode.update({ where: { id }, data: { isActive: false } });
  }

  getPricingMatrix() {
    return this.prisma.pricingMatrix.findMany({
      include: { fromZone: true, toZone: true },
      orderBy: [{ fromZone: { name: 'asc' } }, { toZone: { name: 'asc' } }],
    });
  }

  upsertPricingMatrix(fromZoneId: string, toZoneId: string, baseRate: number, perKgRate: number) {
    return this.prisma.pricingMatrix.upsert({
      where: { fromZoneId_toZoneId: { fromZoneId, toZoneId } },
      create: { fromZoneId, toZoneId, baseRate, perKgRate },
      update: { baseRate, perKgRate },
      include: { fromZone: true, toZone: true },
    });
  }

  deletePricingMatrix(id: string) {
    return this.prisma.pricingMatrix.delete({ where: { id } });
  }
}
