import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('dashboard')
  getDashboard(@Request() req: any) {
    return this.portalService.getDashboard(req.user.email);
  }

  @Post('delivery-requests')
  createDeliveryRequest(@Body() dto: any, @Request() req: any) {
    return this.portalService.createDeliveryRequest(req.user.email, dto);
  }

  @Get('invoices')
  getInvoices(@Request() req: any) {
    return this.portalService.getInvoices(req.user.email);
  }

  @Patch('packages/:id/reschedule')
  reschedulePackage(@Param('id') id: string, @Body() dto: { requestedDate?: string }, @Request() req: any) {
    return this.portalService.reschedulePackage(req.user.email, id, dto.requestedDate);
  }

  @Get('packages')
  getPackages(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.portalService.getPackages(req.user.email, {
      status,
      from,
      to,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    });
  }
}
