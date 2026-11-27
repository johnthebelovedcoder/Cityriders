import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@cityrider/types';

@ApiTags('Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CEO_EXECUTIVE)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get() findAll(@Query('vehicleId') vehicleId?: string) { return this.maintenanceService.findAll(vehicleId); }
  @Get('alerts') getAlerts() { return this.maintenanceService.getAlerts(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.maintenanceService.findOne(id); }
  @Post() @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT) create(@Body() dto: any) { return this.maintenanceService.create(dto); }
  @Patch(':id') @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT) update(@Param('id') id: string, @Body() dto: any) { return this.maintenanceService.update(id, dto); }
  @Delete(':id') @Roles(UserRole.ADMINISTRATOR) @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id') id: string) { return this.maintenanceService.remove(id); }
}
