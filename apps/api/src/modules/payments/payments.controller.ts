import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get() findAll(@Query() query: any) { return this.paymentsService.findAll(query); }
  @Post() create(@Body() dto: any, @Request() req: any) { return this.paymentsService.create(dto, req.user.id); }
  @Patch(':id/correct') correct(@Param('id') id: string, @Body() body: any, @Request() req: any) { return this.paymentsService.correct(id, body.amount, body.reason, req.user.id); }
}
