import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RidersService } from './riders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Riders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('riders')
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Get('stats') getStats() { return this.ridersService.getStats(); }
  @Get() findAll(@Query('search') search?: string) { return this.ridersService.findAll(search); }
  @Get('active') findActive() { return this.ridersService.findActiveRiders(); }
  @Get('smart-dispatch') getSmartDispatch(@Query('zoneId') zoneId?: string) { return this.ridersService.getSmartDispatch(zoneId); }
  @Get(':id') findOne(@Param('id') id: string) { return this.ridersService.findOne(id); }
  @Patch(':id/zone') assignZone(@Param('id') id: string, @Body('zoneId') zoneId: string | null) { return this.ridersService.assignZone(id, zoneId ?? null); }
  @Get(':id/cod-pending') getCodPending(@Param('id') id: string) { return this.ridersService.getCodPending(id); }
  @Post(':id/handover') recordHandover(@Param('id') id: string, @Body('actualAmount') amount: number, @Request() req: any) { return this.ridersService.recordHandover(id, amount, req.user.id); }
  @Get(':id/deliveries') getDeliveries(@Param('id') id: string) { return this.ridersService.getDeliveries(id); }
  @Get(':id/expense-summary') getExpenseSummary(@Param('id') id: string) { return this.ridersService.getExpenseSummary(id); }
  @Get(':id/cod-remittances') getCodRemittances(@Param('id') id: string) { return this.ridersService.getCodRemittances(id); }
  @Patch(':id/cod-remittances/:remittanceId/confirm')
  confirmCodRemittance(@Param('remittanceId') remittanceId: string, @Body('collectedAmount') amount: number, @Request() req: any) {
    return this.ridersService.confirmCodRemittance(remittanceId, amount, req.user.id);
  }
  @Patch('me/location')
  updateMyLocation(@Body() body: { latitude: number; longitude: number }, @Request() req: any) {
    return this.ridersService.updateLocation(req.user.id, body.latitude, body.longitude);
  }
  @Post() create(@Body() dto: any) { return this.ridersService.create(dto); }
  @Patch(':id/status') updateStatus(@Param('id') id: string, @Body('status') status: any) { return this.ridersService.updateStatus(id, status); }
}
