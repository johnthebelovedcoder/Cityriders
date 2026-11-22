import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get() findAll(@Query('vehicleId') vehicleId?: string) { return this.maintenanceService.findAll(vehicleId); }
  @Get('alerts') getAlerts() { return this.maintenanceService.getAlerts(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.maintenanceService.findOne(id); }
  @Post() create(@Body() dto: any) { return this.maintenanceService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.maintenanceService.update(id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id') id: string) { return this.maintenanceService.remove(id); }
}
