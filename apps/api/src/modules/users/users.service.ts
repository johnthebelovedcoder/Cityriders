import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const links = await this.prisma.$queryRaw<Array<{ id: string; customerId: string | null }>>`SELECT "id", "customerId" FROM "users"`;
    const byId = new Map(links.map((link) => [link.id, link.customerId]));
    return users.map((user) => ({ ...user, customerId: byId.get(user.id) ?? null }));
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(dto: { firstName: string; lastName: string; email: string; password: string; phone?: string; role: any; customerId?: string }, performedById: string) {
    if (!dto.password?.trim()) throw new ConflictException('A temporary password is required');
    if (dto.role === 'CUSTOMER' && !dto.customerId) throw new ConflictException('Select a customer account for this portal user');
    if (dto.role !== 'CUSTOMER' && dto.customerId) throw new ConflictException('Only customer portal users can be linked to a customer account');
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 12);
    const { customerId, ...userInput } = dto;
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { ...userInput, password: hashed },
        select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true, createdAt: true },
      });
      if (customerId) await tx.$executeRaw`UPDATE "users" SET "customerId" = ${customerId} WHERE "id" = ${created.id}`;
      return { ...created, customerId: customerId ?? null };
    });
    this.audit.log({ userId: performedById, action: 'CREATE', entity: 'User', entityId: user.id, newValue: { email: user.email, role: user.role, status: user.status } }).catch(() => void 0);
    return user;
  }

  async update(id: string, dto: Partial<{ firstName: string; lastName: string; phone: string; status: any; role: any; customerId: string | null }>, performedById: string) {
    const before = await this.findOrThrow(id);
    const customerId = dto.customerId === undefined ? undefined : dto.customerId;
    const role = dto.role ?? before.role;
    if (role === 'CUSTOMER' && customerId === undefined && !before.customerId) throw new ConflictException('Select a customer account for this portal user');
    if (role !== 'CUSTOMER' && customerId) throw new ConflictException('Only customer portal users can be linked to a customer account');
    const { customerId: _ignored, ...userInput } = dto;
    const updated = await this.prisma.user.update({
      where: { id },
      data: userInput,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, status: true },
    });
    if (customerId !== undefined || role !== 'CUSTOMER') {
      await this.prisma.$executeRaw`UPDATE "users" SET "customerId" = ${role === 'CUSTOMER' ? customerId ?? before.customerId : null} WHERE "id" = ${id}`;
    }
    this.audit.log({
      userId: performedById,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      previousValue: { firstName: before.firstName, lastName: before.lastName, phone: before.phone, role: before.role, status: before.status },
      newValue: { firstName: updated.firstName, lastName: updated.lastName, phone: updated.phone, role: updated.role, status: updated.status },
    }).catch(() => void 0);
    return { ...updated, customerId: role === 'CUSTOMER' ? customerId ?? before.customerId : null };
  }

  async findOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, status: true, createdAt: true, lastLoginAt: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    const [link] = await this.prisma.$queryRaw<Array<{ customerId: string | null }>>`SELECT "customerId" FROM "users" WHERE "id" = ${id}`;
    return { ...user, customerId: link?.customerId ?? null };
  }
}
