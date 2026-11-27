import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@cityrider/types';

@ApiTags('Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('dashboard')
  getDashboard(@Request() req: any) {
    return this.portalService.getDashboard(req.user.id);
  }

  @Post('delivery-requests')
  createDeliveryRequest(@Body() dto: any, @Request() req: any) {
    return this.portalService.createDeliveryRequest(req.user.id, dto);
  }

  @Get('invoices')
  getInvoices(@Request() req: any) {
    return this.portalService.getInvoices(req.user.id);
  }

  @Get('statement')
  getStatement(@Request() req: any) {
    return this.portalService.getStatement(req.user.id);
  }

  @Patch('packages/:id/reschedule')
  reschedulePackage(@Param('id') id: string, @Body() dto: { requestedDate?: string }, @Request() req: any) {
    return this.portalService.reschedulePackage(req.user.id, id, dto.requestedDate);
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
    return this.portalService.getPackages(req.user.id, {
      status,
      from,
      to,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    });
  }
}
