import { Controller, Get, Patch, Post, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get system settings' })
  get() { return this.settingsService.get(); }

  @Patch()
  @ApiOperation({ summary: 'Update system settings' })
  update(@Body() dto: any) { return this.settingsService.update(dto); }

  @Post('zones')
  @ApiOperation({ summary: 'Add a delivery zone' })
  addZone(@Body() body: { name: string; basePrice: number }) {
    return this.settingsService.addZone(body.name, body.basePrice);
  }

  @Patch('zones/:id')
  @ApiOperation({ summary: 'Update a delivery zone' })
  updateZone(@Param('id') id: string, @Body() body: { name?: string; basePrice?: number }) {
    return this.settingsService.updateZone(id, body);
  }

  @Delete('zones/:id')
  @ApiOperation({ summary: 'Remove a delivery zone' })
  deleteZone(@Param('id') id: string) { return this.settingsService.deleteZone(id); }

  @Get('failure-reason-codes')
  @ApiOperation({ summary: 'List all failure reason codes' })
  getFailureReasonCodes() { return this.settingsService.getFailureReasonCodes(); }

  @Post('failure-reason-codes')
  @ApiOperation({ summary: 'Create a failure reason code' })
  createFailureReasonCode(@Body() body: { code: string; label: string; description?: string }) {
    return this.settingsService.createFailureReasonCode(body);
  }

  @Patch('failure-reason-codes/:id')
  @ApiOperation({ summary: 'Update a failure reason code' })
  updateFailureReasonCode(@Param('id') id: string, @Body() body: { label?: string; description?: string; isActive?: boolean }) {
    return this.settingsService.updateFailureReasonCode(id, body);
  }

  @Delete('failure-reason-codes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a failure reason code' })
  deleteFailureReasonCode(@Param('id') id: string) { return this.settingsService.deleteFailureReasonCode(id); }

  @Get('pricing-matrix')
  @ApiOperation({ summary: 'Get pricing matrix' })
  getPricingMatrix() { return this.settingsService.getPricingMatrix(); }

  @Post('pricing-matrix')
  @ApiOperation({ summary: 'Upsert a pricing matrix entry' })
  upsertPricingMatrix(@Body() body: { fromZoneId: string; toZoneId: string; baseRate: number; perKgRate: number }) {
    return this.settingsService.upsertPricingMatrix(body.fromZoneId, body.toZoneId, body.baseRate, body.perKgRate);
  }

  @Delete('pricing-matrix/:id')
  @ApiOperation({ summary: 'Delete a pricing matrix entry' })
  deletePricingMatrix(@Param('id') id: string) { return this.settingsService.deletePricingMatrix(id); }
}
