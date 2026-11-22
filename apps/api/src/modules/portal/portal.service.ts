import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { generateTrackingNumber } from '@cityrider/utils';

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  private async findCustomerByEmail(email: string) {
    const customer = await this.prisma.customer.findFirst({ where: { email } });
    if (!customer) throw new NotFoundException('No customer account linked to this user');
    return customer;
  }

  async getDashboard(userEmail: string) {
    const customer = await this.findCustomerByEmail(userEmail);

    const [total, byStatus, recent] = await Promise.all([
      this.prisma.package.count({ where: { senderId: customer.id } }),
      this.prisma.package.groupBy({ by: ['status'], where: { senderId: customer.id }, _count: { _all: true } }),
      this.prisma.package.findMany({
        where: { senderId: customer.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { recipient: { select: { name: true } } },
      }),
    ]);

    const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;

    return {
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
      stats: {
        total,
        delivered: count('DELIVERED'),
        inProgress: byStatus.filter((b) => !['DELIVERED', 'RETURNED', 'CANCELLED'].includes(b.status)).reduce((s, b) => s + b._count._all, 0),
        failed: count('DELIVERY_ATTEMPTED') + count('RETURNED'),
      },
      recent,
    };
  }

  private async findUserByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User account not found');
    return user;
  }

  async createDeliveryRequest(userEmail: string, dto: {
    recipientName: string;
    recipientPhone: string;
    pickupAddress?: string;
    destAddress?: string;
    destCity: string;
    description?: string;
    weight?: number;
  }) {
    if (!dto.recipientName || !dto.recipientPhone || !dto.destCity) {
      throw new BadRequestException('recipientName, recipientPhone and destCity are required');
    }

    const [customer, user] = await Promise.all([
      this.findCustomerByEmail(userEmail),
      this.findUserByEmail(userEmail),
    ]);

    return this.prisma.$transaction(async (tx) => {
      let recipient = await tx.recipient.findFirst({ where: { phone: dto.recipientPhone } });
      if (!recipient) {
        recipient = await tx.recipient.create({
          data: { name: dto.recipientName, phone: dto.recipientPhone, deliveryAddress: dto.destAddress ?? '' },
        });
      }

      let trackingNumber: string;
      for (let i = 0; i < 10; i++) {
        const tn = generateTrackingNumber();
        const existing = await tx.package.findUnique({ where: { trackingNumber: tn } });
        if (!existing) { trackingNumber = tn; break; }
      }
      if (!trackingNumber!) throw new Error('Could not generate tracking number');

      const pkg = await tx.package.create({
        data: {
          trackingNumber,
          description: dto.description,
          weight: dto.weight,
          destStreet: dto.destAddress ?? '',
          destCity: dto.destCity,
          destState: '',
          destCountry: 'NG',
          destPostalCode: '',
          originStreet: dto.pickupAddress ?? '',
          originCity: '',
          originState: '',
          originCountry: 'NG',
          originPostalCode: '',
          senderId: customer.id,
          recipientId: recipient.id,
          createdById: user.id,
          status: 'AWAITING_ASSIGNMENT' as any,
        },
      });

      await tx.packageStatusEvent.create({
        data: { packageId: pkg.id, status: 'AWAITING_ASSIGNMENT' as any, performedById: user.id, isCustomerVisible: true },
      });

      return {
        id: pkg.id,
        trackingNumber: pkg.trackingNumber,
        status: pkg.status,
        createdAt: pkg.createdAt,
        destCity: pkg.destCity,
        recipient: { name: dto.recipientName, phone: dto.recipientPhone },
      };
    });
  }

  async getInvoices(userEmail: string) {
    const customer = await this.findCustomerByEmail(userEmail);
    return this.prisma.invoice.findMany({
      where: { customerId: customer.id },
      include: { _count: { select: { lineItems: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async reschedulePackage(userEmail: string, packageId: string, requestedDate?: string) {
    const [customer, user] = await Promise.all([
      this.findCustomerByEmail(userEmail),
      this.findUserByEmail(userEmail),
    ]);
    const pkg = await this.prisma.package.findFirst({
      where: { id: packageId, senderId: customer.id },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    if (!['DELIVERY_ATTEMPTED', 'RESCHEDULED'].includes(pkg.status as string)) {
      throw new BadRequestException('Only packages with a failed delivery attempt can be rescheduled');
    }

    const note = requestedDate
      ? `Customer requested reschedule for ${new Date(requestedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : 'Customer requested reschedule';

    await this.prisma.package.update({
      where: { id: packageId },
      data: {
        status: 'RESCHEDULED' as any,
        ...(requestedDate ? { promisedDelivery: new Date(requestedDate) } : {}),
        statusHistory: {
          create: { status: 'RESCHEDULED' as any, note, performedById: user.id, isCustomerVisible: true },
        },
      },
    });

    return { success: true, message: 'Reschedule request submitted' };
  }

  async getPackages(userEmail: string, query: { status?: string; from?: string; to?: string; page?: number; limit?: number } = {}) {
    const customer = await this.findCustomerByEmail(userEmail);
    const { status, from, to, page = 1, limit = 20 } = query;

    const where: any = { senderId: customer.id };
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to + 'T23:59:59');
    }

    const [data, total] = await Promise.all([
      this.prisma.package.findMany({
        where,
        include: {
          recipient: { select: { name: true, deliveryAddress: true } },
          statusHistory: { orderBy: { createdAt: 'desc' }, take: 3, select: { status: true, note: true, createdAt: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.package.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }
}
