import { Controller, Get, Post, Patch, Query, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomerServiceService } from './customer-service.service';

@Controller('customer-service')
@UseGuards(JwtAuthGuard)
export class CustomerServiceController {
  constructor(private readonly svc: CustomerServiceService) {}

  @Get('packages/search')
  searchPackages(
    @Query('q') q?: string,
    @Query('customerId') customerId?: string,
    @Query('recipientPhone') recipientPhone?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.svc.searchPackages(q, customerId, recipientPhone, dateFrom, dateTo);
  }

  @Get('packages/:id')
  getPackageDetail(@Param('id') id: string) {
    return this.svc.getPackageDetail(id);
  }

  @Get('interactions')
  listInteractions(@Query('packageId') packageId?: string, @Query('customerId') customerId?: string) {
    return this.svc.listInteractions(packageId, customerId);
  }

  @Post('interactions')
  createInteraction(@Body() body: any, @Request() req: any) {
    return this.svc.createInteraction({ ...body, staffId: req.user.id });
  }

  @Get('escalations')
  listEscalations(@Query('status') status?: string) {
    return this.svc.listEscalations(status);
  }

  @Post('escalations')
  createEscalation(@Body() body: any, @Request() req: any) {
    return this.svc.createEscalation({ ...body, raisedById: req.user.id });
  }

  @Patch('escalations/:id')
  updateEscalation(@Param('id') id: string, @Body() body: { status?: string; resolution?: string }) {
    return this.svc.updateEscalation(id, body);
  }
}
