import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(dto: { firstName: string; lastName: string; email: string; password: string; phone?: string; role: any }) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: { ...dto, password: hashed },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true, createdAt: true },
    });
  }

  async update(id: string, dto: Partial<{ firstName: string; lastName: string; phone: string; status: any; role: any }>) {
    await this.findOrThrow(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true },
    });
  }

  async findOrThrow(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }
}
