import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Frontend-matching typed endpoints (from/to query params)
  @Get('delivery-summary') deliverySummary(@Query('from') from?: string, @Query('to') to?: string) { return this.reportsService.getDeliverySummary(from, to); }
  @Get('revenue') revenue(@Query('from') from?: string, @Query('to') to?: string) { return this.reportsService.getRevenue(from, to); }
  @Get('rider-performance') riderPerformance(@Query('from') from?: string, @Query('to') to?: string) { return this.reportsService.getRiderPerformance(from, to); }
  @Get('profit-loss') profitLoss(@Query('from') from?: string, @Query('to') to?: string) { return this.reportsService.getProfitLoss(from, to); }
  @Get('customer-activity') customerActivity(@Query('from') from?: string, @Query('to') to?: string) { return this.reportsService.getCustomerActivity(from, to); }
  @Get('sla-breach') slaBreach(@Query('from') from?: string, @Query('to') to?: string) { return this.reportsService.getSlaBreach(from, to); }
  @Get('revenue-by-zone') revenueByZone(@Query('from') from?: string, @Query('to') to?: string) { return this.reportsService.getRevenueByZone(from, to); }

  // Legacy endpoints (dateFrom/dateTo)
  @Get('packages') packageSummary(@Query('dateFrom') df?: string, @Query('dateTo') dt?: string) { return this.reportsService.getPackageSummary(df, dt); }
  @Get('riders') riderActivity(@Query('dateFrom') df?: string, @Query('dateTo') dt?: string) { return this.reportsService.getRiderActivity(df, dt); }
  @Get('financial') financial(@Query('dateFrom') df?: string, @Query('dateTo') dt?: string) { return this.reportsService.getFinancialSummary(df, dt); }
}
