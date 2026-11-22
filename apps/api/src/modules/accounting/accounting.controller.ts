import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('summary') getSummary() { return this.accountingService.getSummary(); }
  @Get('income') getIncome(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.accountingService.getIncome(page ? +page : 1, limit ? +limit : 25);
  }
  @Get('cod-reconciliation') getCodReconciliation(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.accountingService.getCodReconciliation(page ? +page : 1, limit ? +limit : 25);
  }
  @Get('invoices') getInvoices(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.accountingService.getAccountingInvoices(page ? +page : 1, limit ? +limit : 25);
  }
}
