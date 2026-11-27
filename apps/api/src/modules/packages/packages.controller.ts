import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { PackagesService } from './packages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@cityrider/types';

@ApiTags('Packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.CEO_EXECUTIVE)
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @ApiOperation({ summary: 'List packages with optional filters' })
  findAll(@Query() query: any) {
    return this.packagesService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get package counts by status group' })
  getStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.packagesService.getStats(from, to);
  }

  @Get('kanban')
  @ApiOperation({ summary: 'Get packages grouped by Kanban column status' })
  getKanban() {
    return this.packagesService.getKanban();
  }

  @Get('sla-alerts')
  @ApiOperation({ summary: 'Get packages approaching or past SLA deadline' })
  getSlaAlerts() {
    return this.packagesService.getSlaAlerts();
  }

  @Get('reconciliation/pending')
  @ApiOperation({ summary: 'List delivered packages pending receipt reconciliation' })
  getReconciliationPending(@Query('search') search?: string) {
    return this.packagesService.getReconciliationPending(search);
  }

  @Get('orders')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'List customer orders and intake reconciliation status' })
  listOrders(@Query('status') status?: string) {
    return this.packagesService.listOrders(status);
  }

  @Post('orders/:id/collection')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Record customer order collection and pickup location' })
  recordOrderCollection(@Param('id') id: string, @Body() body: { pickupLocationId?: string }, @Request() req: any) {
    return this.packagesService.recordOrderCollection(id, body, req.user.id);
  }

  @Patch('orders/:id/intake-reconciliation')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Reconcile expected and received packages for a customer order' })
  reconcileOrder(@Param('id') id: string, @Body() body: { expectedPackageCount: number; receivedPackageCount?: number; discrepancyNote?: string }, @Request() req: any) {
    return this.packagesService.reconcileOrder(id, body, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get package details' })
  findOne(@Param('id') id: string) {
    return this.packagesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Register a new package' })
  create(@Body() dto: any, @Request() req: any) {
    return this.packagesService.create(dto, req.user.id);
  }

  @Post('bulk-upload')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Bulk create packages from CSV or Excel file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  bulkUpload(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    return this.packagesService.bulkUpload(file.buffer, req.user.id, file.originalname);
  }

  @Post('bulk-status')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Bulk update status for multiple packages' })
  bulkUpdateStatus(@Body() body: { packageIds: string[]; status: string }, @Request() req: any) {
    return this.packagesService.bulkUpdateStatus(body.packageIds, body.status, req.user.id);
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Assign a rider to a package' })
  assign(@Param('id') id: string, @Body() body: { riderId: string; reason?: string }, @Request() req: any) {
    return this.packagesService.assignRider(id, body.riderId, req.user.id, body.reason);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Update package status' })
  updateStatus(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.packagesService.updateStatus(id, body.status, body.note, req.user.id, {
      failureReasonCodeId: body.failureReasonCodeId,
      reattemptAt: body.reattemptAt,
    });
  }

  @Post(':id/delivery-corrections')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Record an authorized correction to a completed delivery outcome' })
  correctDeliveredOutcome(@Param('id') id: string, @Body() body: { status: string; reason: string }, @Request() req: any) {
    return this.packagesService.correctDeliveredOutcome(id, body.status, body.reason, req.user.id);
  }

  @Patch(':id/reconcile')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Mark a delivered package as receipt-reconciled' })
  reconcile(@Param('id') id: string, @Request() req: any) {
    return this.packagesService.reconcilePackage(id, req.user.id);
  }
}
