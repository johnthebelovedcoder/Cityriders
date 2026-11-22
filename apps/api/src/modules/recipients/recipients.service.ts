import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RecipientsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: { name: string; phone: string; email?: string; deliveryAddress: string; deliveryNotes?: string }) {
    return this.prisma.recipient.create({ data: dto });
  }
}
