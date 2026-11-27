import { Controller, Get, Post, Param, Body, UseGuards, Request, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@cityrider/types';

@ApiTags('Deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RIDER)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('my')
  getMyDeliveries(@Request() req: any) {
    return this.deliveriesService.getMyDeliveries(req.user.id);
  }

  @Post(':packageId/status')
  updateStatus(@Param('packageId') packageId: string, @Body() body: any, @Request() req: any) {
    return this.deliveriesService.updateStatus(packageId, body.status, body.note, body.failedReason, req.user.id, body.reattemptAt);
  }

  @Post(':packageId/proof')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'photo', maxCount: 1 }, { name: 'signature', maxCount: 1 }], { limits: { fileSize: 5 * 1024 * 1024 } }))
  submitProof(@Param('packageId') packageId: string, @Body() body: any, @UploadedFiles() files: { photo?: Express.Multer.File[]; signature?: Express.Multer.File[] }, @Request() req: any) {
    return this.deliveriesService.submitProof(packageId, body, files ?? {}, req.user.id);
  }
}
