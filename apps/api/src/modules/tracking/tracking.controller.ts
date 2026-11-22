import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TrackingService } from './tracking.service';

@ApiTags('Tracking')
@Controller('track')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all active deliveries for live tracking map' })
  getActive() {
    return this.trackingService.getActive();
  }

  @Get(':trackingNumber')
  @ApiOperation({ summary: 'Public package tracking — no auth required' })
  track(@Param('trackingNumber') trackingNumber: string) {
    return this.trackingService.track(trackingNumber);
  }

  @Post(':trackingNumber/reschedule')
  @ApiOperation({ summary: 'Public reschedule request — no auth required' })
  reschedule(@Param('trackingNumber') trackingNumber: string, @Body() body: { preferredDate: string; notes?: string }) {
    return this.trackingService.requestReschedule(trackingNumber, body);
  }

  @Post(':trackingNumber/dispute')
  @ApiOperation({ summary: 'Public dispute submission — no auth required' })
  dispute(@Param('trackingNumber') trackingNumber: string, @Body() body: { reason: string; description: string; contact?: string }) {
    return this.trackingService.submitDispute(trackingNumber, body);
  }
}
