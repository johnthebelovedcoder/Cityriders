import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CustomerPricingService } from './customer-pricing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly customerPricingService: CustomerPricingService,
  ) {}

  @Get('stats') getStats() { return this.customersService.getStats(); }
  @Get() findAll(@Query('search') search?: string, @Query('paymentTerms') paymentTerms?: string) { return this.customersService.findAll(search, paymentTerms); }
  @Get(':id') findOne(@Param('id') id: string) { return this.customersService.findOne(id); }
  @Post() create(@Body() dto: any) { return this.customersService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.customersService.update(id, dto); }

  @Get(':id/pricing') getPricing(@Param('id') id: string) { return this.customerPricingService.getOverride(id); }
  @Put(':id/pricing') upsertPricing(@Param('id') id: string, @Body() dto: any) { return this.customerPricingService.upsertOverride(id, dto); }
  @Delete(':id/pricing') @HttpCode(HttpStatus.NO_CONTENT) deletePricing(@Param('id') id: string) { return this.customerPricingService.deleteOverride(id); }
}
