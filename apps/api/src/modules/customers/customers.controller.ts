import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CustomerPricingService } from './customer-pricing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@cityrider/types';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.CEO_EXECUTIVE)
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly customerPricingService: CustomerPricingService,
  ) {}

  @Get('stats') getStats() { return this.customersService.getStats(); }
  @Get() findAll(@Query('search') search?: string, @Query('paymentTerms') paymentTerms?: string) { return this.customersService.findAll(search, paymentTerms); }
  @Get(':id') findOne(@Param('id') id: string) { return this.customersService.findOne(id); }
  @Post() @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER) create(@Body() dto: any) { return this.customersService.create(dto); }
  @Patch(':id') @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER) update(@Param('id') id: string, @Body() dto: any) { return this.customersService.update(id, dto); }
  @Delete(':id') @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER) @HttpCode(HttpStatus.NO_CONTENT) archive(@Param('id') id: string) { return this.customersService.archive(id); }

  @Get(':id/pickup-locations') getPickupLocations(@Param('id') id: string) { return this.customersService.getPickupLocations(id); }
  @Post(':id/pickup-locations') @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER) createPickupLocation(@Param('id') id: string, @Body() dto: any) { return this.customersService.createPickupLocation(id, dto); }
  @Patch(':id/pickup-locations/:locationId') @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER) updatePickupLocation(@Param('id') id: string, @Param('locationId') locationId: string, @Body() dto: any) { return this.customersService.updatePickupLocation(id, locationId, dto); }
  @Delete(':id/pickup-locations/:locationId') @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER) @HttpCode(HttpStatus.NO_CONTENT) deletePickupLocation(@Param('id') id: string, @Param('locationId') locationId: string) { return this.customersService.deletePickupLocation(id, locationId); }

  @Get(':id/pricing') getPricing(@Param('id') id: string) { return this.customerPricingService.getOverride(id); }
  @Put(':id/pricing') @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER) upsertPricing(@Param('id') id: string, @Body() dto: any) { return this.customerPricingService.upsertOverride(id, dto); }
  @Delete(':id/pricing') @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER) @HttpCode(HttpStatus.NO_CONTENT) deletePricing(@Param('id') id: string) { return this.customerPricingService.deleteOverride(id); }

  @Post(':id/portal-invite')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER)
  sendPortalInvite(@Param('id') id: string, @Request() req: any) { return this.customersService.sendPortalInvite(id, req.headers?.host); }
}
