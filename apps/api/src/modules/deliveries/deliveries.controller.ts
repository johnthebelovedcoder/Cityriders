import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('my')
  getMyDeliveries(@Request() req: any) {
    return this.deliveriesService.getMyDeliveries(req.user.id);
  }

  @Post(':packageId/status')
  updateStatus(@Param('packageId') packageId: string, @Body() body: any, @Request() req: any) {
    return this.deliveriesService.updateStatus(packageId, body.status, body.note, body.failedReason, req.user.id);
  }

  @Post(':packageId/proof')
  submitProof(@Param('packageId') packageId: string, @Body() body: any, @Request() req: any) {
    return this.deliveriesService.submitProof(packageId, body, req.user.id);
  }
}
