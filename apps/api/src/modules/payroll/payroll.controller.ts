import { Controller, Get, Post, Patch, Param, Query, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PayrollService } from './payroll.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@cityrider/types';

@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.CEO_EXECUTIVE)
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get()
  getPeriod(@Query('period') period?: string) {
    const p = period ?? (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
    return this.payroll.getOrGeneratePeriod(p);
  }

  @Post('run')
  run(@Body('period') period: string) {
    return this.payroll.runPayroll(period);
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
