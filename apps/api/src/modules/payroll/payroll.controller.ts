import { Controller, Get, Patch, Param, Query, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PayrollService } from './payroll.service';

@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get()
  getPeriod(@Query('period') period?: string) {
    const p = period ?? (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
    return this.payroll.getOrGeneratePeriod(p);
  }

  @Patch(':id/pay')
  markPaid(@Param('id') id: string, @Request() req: any) {
    return this.payroll.markPaid(id, req.user.id);
  }

  @Patch(':id/bonus')
  updateBonus(@Param('id') id: string, @Body('bonus') bonus: number) {
    return this.payroll.updateBonus(id, Number(bonus));
  }
}
