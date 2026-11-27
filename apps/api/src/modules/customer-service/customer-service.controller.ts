import { Controller, Get, Post, Patch, Delete, Query, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@cityrider/types';
import { CustomerServiceService } from './customer-service.service';

@Controller('customer-service')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.CUSTOMER_SERVICE, UserRole.CEO_EXECUTIVE)
export class CustomerServiceController {
  constructor(private readonly svc: CustomerServiceService) {}

  @Get('packages/search')
  searchPackages(
    @Query('q') q: string | undefined,
    @Query('customerId') customerId: string | undefined,
    @Query('recipientPhone') recipientPhone: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Request() req: any,
  ) {
    return this.svc.searchPackages(q, customerId, recipientPhone, dateFrom, dateTo, req.user.id, req.user.role);
  }

  @Get('packages/:id')
  getPackageDetail(@Param('id') id: string, @Request() req: any) {
    return this.svc.getPackageDetail(id, req.user.id, req.user.role);
  }

  @Get('customers/:customerId/summary')
  getCustomerSummary(@Param('customerId') customerId: string, @Query('date') date: string | undefined, @Request() req: any) {
    return this.svc.getCustomerSummary(customerId, date, req.user.id, req.user.role);
  }

  @Get('customers/:customerId/packages')
  getCustomerPackages(@Param('customerId') customerId: string, @Request() req: any) {
    return this.svc.getCustomerPackages(customerId, req.user.id, req.user.role);
  }

  @Get('followups')
  getFollowups(@Request() req: any) {
    return this.svc.getFollowups(req.user.id, req.user.role);
  }

  @Get('interactions')
  listInteractions(@Query('packageId') packageId: string | undefined, @Query('customerId') customerId: string | undefined, @Request() req: any) {
    return this.svc.listInteractions(packageId, customerId, req.user.id, req.user.role);
  }

  @Post('interactions')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.CUSTOMER_SERVICE)
  createInteraction(@Body() body: any, @Request() req: any) {
    return this.svc.createInteraction({ ...body, staffId: req.user.id }, req.user.role);
  }

  @Get('escalations')
  listEscalations(@Query('status') status: string | undefined, @Request() req: any) {
    return this.svc.listEscalations(status, req.user.id, req.user.role);
  }

  @Post('escalations')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.CUSTOMER_SERVICE)
  createEscalation(@Body() body: any, @Request() req: any) {
    return this.svc.createEscalation({ ...body, raisedById: req.user.id }, req.user.role);
  }

  @Patch('escalations/:id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.CUSTOMER_SERVICE)
  updateEscalation(@Param('id') id: string, @Body() body: { status?: string; resolution?: string }, @Request() req: any) {
    return this.svc.updateEscalation(id, body, req.user.id, req.user.role);
  }

  @Get('coverage')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER)
  listCoverage(@Query('staffUserId') staffUserId?: string) { return this.svc.listCoverage(staffUserId); }

  @Post('coverage')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER)
  assignCoverage(@Body() body: { staffUserId: string; customerId: string }, @Request() req: any) {
    return this.svc.assignCoverage(body.staffUserId, body.customerId, req.user.id);
  }

  @Delete('coverage/:staffUserId/:customerId')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER)
  removeCoverage(@Param('staffUserId') staffUserId: string, @Param('customerId') customerId: string, @Request() req: any) {
    return this.svc.removeCoverage(staffUserId, customerId, req.user.id);
  }
}
