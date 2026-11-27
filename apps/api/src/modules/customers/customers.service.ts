import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(search?: string, paymentTerms?: string) {
    const customers = await this.prisma.customer.findMany({
      where: {
        status: 'ACTIVE',
        ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } : {}),
        ...(paymentTerms ? { paymentTerms: paymentTerms as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    const profile = await this.prisma.$queryRaw<Array<{ id: string; contactPerson: string | null; billingAddress: string | null }>>`SELECT "id", "contactPerson", "billingAddress" FROM "customers"`;
    const byId = new Map(profile.map((row) => [row.id, row]));
    return customers.map((customer) => ({ ...customer, ...(byId.get(customer.id) ?? {}) }));
  }

  async getStats() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const [total, newThisMonth, withPackages] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.customer.count({ where: { packages: { some: {} } } }),
    ]);
    return { total, newThisMonth, withPackages };
  }

  async findOne(id: string) {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Customer ${id} not found`);
    const [profile] = await this.prisma.$queryRaw<Array<{ contactPerson: string | null; billingAddress: string | null }>>`SELECT "contactPerson", "billingAddress" FROM "customers" WHERE "id" = ${id}`;
    return { ...c, ...profile };
  }

  create(dto: {
    name: string; phone: string; email?: string; address?: string;
    type?: string; creditLimit?: number; paymentTerms?: string;
    billingCycle?: string; status?: string; taxId?: string; contactPerson?: string; billingAddress?: string;
  }) {
    const { contactPerson, billingAddress, ...base } = dto;
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({ data: base as any });
      await tx.$executeRaw`UPDATE "customers" SET "contactPerson" = ${contactPerson ?? null}, "billingAddress" = ${billingAddress ?? null} WHERE "id" = ${customer.id}`;
      return { ...customer, contactPerson: contactPerson ?? null, billingAddress: billingAddress ?? null };
    });
  }

  async update(id: string, dto: Partial<{
    name: string; phone: string; email: string; address: string;
    type: string; creditLimit: number; paymentTerms: string;
    billingCycle: string; status: string; taxId: string; contactPerson: string; billingAddress: string;
  }>) {
    await this.findOne(id);
    const { contactPerson, billingAddress, ...base } = dto;
    const customer = await this.prisma.customer.update({ where: { id }, data: base as any });
    if (contactPerson !== undefined || billingAddress !== undefined) await this.prisma.$executeRaw`UPDATE "customers" SET "contactPerson" = CASE WHEN ${contactPerson !== undefined} THEN ${contactPerson ?? null} ELSE "contactPerson" END, "billingAddress" = CASE WHEN ${billingAddress !== undefined} THEN ${billingAddress ?? null} ELSE "billingAddress" END WHERE "id" = ${id}`;
    return { ...customer, contactPerson: contactPerson ?? undefined, billingAddress: billingAddress ?? undefined };
  }

  async getPickupLocations(customerId: string) {
    await this.findOne(customerId);
    const locations = await this.prisma.customerPickupLocation.findMany({ where: { customerId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
    const details = await this.prisma.$queryRaw<Array<{ id: string; instructions: string | null }>>`SELECT "id", "instructions" FROM "customer_pickup_locations" WHERE "customerId" = ${customerId}`;
    const byId = new Map(details.map((row) => [row.id, row.instructions]));
    return locations.map((location) => ({ ...location, instructions: byId.get(location.id) ?? null }));
  }

  async createPickupLocation(customerId: string, input: any) {
    await this.findOne(customerId);
    if (!input.label?.trim() || !input.address?.trim() || !input.city?.trim()) throw new BadRequestException('Label, address, and city are required');
    return this.prisma.$transaction(async (tx) => {
      if (input.isDefault) await tx.customerPickupLocation.updateMany({ where: { customerId }, data: { isDefault: false } });
      const location = await tx.customerPickupLocation.create({ data: { customerId, label: input.label.trim(), address: input.address.trim(), city: input.city.trim(), state: input.state?.trim() || null, isDefault: Boolean(input.isDefault) } });
      await tx.$executeRaw`UPDATE "customer_pickup_locations" SET "instructions" = ${input.instructions?.trim() || null} WHERE "id" = ${location.id}`;
      return { ...location, instructions: input.instructions?.trim() || null };
    });
  }

  async updatePickupLocation(customerId: string, locationId: string, input: any) {
    const existing = await this.prisma.customerPickupLocation.findFirst({ where: { id: locationId, customerId }, select: { id: true } });
    if (!existing) throw new NotFoundException('Pickup location not found');
    return this.prisma.$transaction(async (tx) => {
      if (input.isDefault) await tx.customerPickupLocation.updateMany({ where: { customerId, id: { not: locationId } }, data: { isDefault: false } });
      const location = await tx.customerPickupLocation.update({ where: { id: locationId }, data: { ...(input.label !== undefined ? { label: input.label.trim() } : {}), ...(input.address !== undefined ? { address: input.address.trim() } : {}), ...(input.city !== undefined ? { city: input.city.trim() } : {}), ...(input.state !== undefined ? { state: input.state.trim() || null } : {}), ...(input.isDefault !== undefined ? { isDefault: Boolean(input.isDefault) } : {}) } });
      if (input.instructions !== undefined) await tx.$executeRaw`UPDATE "customer_pickup_locations" SET "instructions" = ${input.instructions.trim() || null} WHERE "id" = ${locationId}`;
      const [details] = await tx.$queryRaw<Array<{ instructions: string | null }>>`SELECT "instructions" FROM "customer_pickup_locations" WHERE "id" = ${locationId}`;
      return { ...location, ...details };
    });
  }

  async deletePickupLocation(customerId: string, locationId: string) {
    const result = await this.prisma.customerPickupLocation.deleteMany({ where: { id: locationId, customerId } });
    if (!result.count) throw new NotFoundException('Pickup location not found');
  }

  async archive(id: string) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: { status: 'SUSPENDED' } });
  }

  async sendPortalInvite(id: string, host?: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (!customer.email) throw new BadRequestException('Customer has no email address on file');

    const tokenPayload = Buffer.from(JSON.stringify({
      customerId: id,
      email: customer.email,
      name: customer.name,
      exp: Date.now() + 48 * 3600 * 1000,
    })).toString('base64');

    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const appUrl = process.env.APP_URL ?? (host ? `${protocol}://${host.replace('/api/v1', '')}` : 'http://localhost:3000');
    const inviteUrl = `${appUrl}/accept-invite?token=${encodeURIComponent(tokenPayload)}`;

    if (this.notifications.isEmailConfigured) {
      await this.notifications.sendEmail(
        customer.email,
        'Your CityRider customer portal invitation',
        `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#AE1805">CityRider Portal Invitation</h2>
          <p>Hi <strong>${customer.name}</strong>,</p>
          <p>You've been invited to access the CityRider customer portal where you can track shipments and manage your account.</p>
          <p><a href="${inviteUrl}" style="display:inline-block;background:#FFB217;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Create your account</a></p>
          <p style="color:#666;font-size:13px">This link expires in 48 hours.</p>
        </div>`,
      );
    }

    return { inviteUrl, sentTo: customer.email };
  }
}
