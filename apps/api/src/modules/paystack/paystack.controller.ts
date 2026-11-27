import { Controller, Post, Body, Param, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaystackService } from './paystack.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@cityrider/types';

@ApiTags('Paystack')
@Controller('paystack')
export class PaystackController {
  constructor(
    private readonly paystackService: PaystackService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('initialize')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Initialize a Paystack payment' })
  async initialize(@Body() body: { email: string; amount: number; packageId?: string; customerId?: string }, @Request() req: any) {
    const reference = `CR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const result = await this.paystackService.initialize(body.email, body.amount * 100, reference, {
      packageId: body.packageId,
      customerId: body.customerId,
      recordedById: req.user.id,
    });
    return { ...result, reference };
  }

  @Get('verify/:reference')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Verify a Paystack payment and record it' })
  async verify(@Param('reference') reference: string, @Request() req: any) {
    const tx = await this.paystackService.verify(reference);
    if (tx.status === 'success') {
      await this.prisma.payment.create({
        data: {
          amount: tx.amount / 100,
          currency: tx.currency,
          method: 'ONLINE',
          status: 'COMPLETED',
          reference,
          notes: `Paystack: ${tx.gateway_response}`,
          paymentDate: new Date(),
          recordedById: req.user.id,
        },
      });
    }
    return tx;
  }
}
