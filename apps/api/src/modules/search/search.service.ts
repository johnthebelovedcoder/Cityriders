import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string) {
    if (!q || q.trim().length < 2) return { packages: [], customers: [], riders: [] };
    const term = q.trim();

    const [packages, customers, riders] = await Promise.all([
      this.prisma.package.findMany({
        where: {
          OR: [
            { trackingNumber: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { destCity: { contains: term, mode: 'insensitive' } },
            { sender: { name: { contains: term, mode: 'insensitive' } } },
            { recipient: { name: { contains: term, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          trackingNumber: true,
          status: true,
          destCity: true,
          sender: { select: { name: true } },
          recipient: { select: { name: true } },
        },
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, phone: true, type: true, status: true },
        take: 5,
        orderBy: { name: 'asc' },
      }),
      this.prisma.rider.findMany({
        where: {
          OR: [
            { user: { firstName: { contains: term, mode: 'insensitive' } } },
            { user: { lastName: { contains: term, mode: 'insensitive' } } },
            { user: { phone: { contains: term, mode: 'insensitive' } } },
            { riderId: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          riderId: true,
          status: true,
          user: { select: { firstName: true, lastName: true, phone: true } },
        },
        take: 4,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { packages, customers, riders };
  }
}
