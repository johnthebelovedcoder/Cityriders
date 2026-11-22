import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { PackagesService } from './packages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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

  @Get(':id')
  @ApiOperation({ summary: 'Get package details' })
  findOne(@Param('id') id: string) {
    return this.packagesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new package' })
  create(@Body() dto: any, @Request() req: any) {
    return this.packagesService.create(dto, req.user.id);
  }

  @Post('bulk-upload')
  @ApiOperation({ summary: 'Bulk create packages from CSV or Excel file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  bulkUpload(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    return this.packagesService.bulkUpload(file.buffer, req.user.id, file.originalname);
  }

  @Post('bulk-status')
  @ApiOperation({ summary: 'Bulk update status for multiple packages' })
  bulkUpdateStatus(@Body() body: { packageIds: string[]; status: string }, @Request() req: any) {
    return this.packagesService.bulkUpdateStatus(body.packageIds, body.status, req.user.id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign a rider to a package' })
  assign(@Param('id') id: string, @Body() body: { riderId: string; reason?: string }, @Request() req: any) {
    return this.packagesService.assignRider(id, body.riderId, req.user.id, body.reason);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update package status' })
  updateStatus(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.packagesService.updateStatus(id, body.status, body.note, req.user.id, {
      failureReasonCodeId: body.failureReasonCodeId,
      reattemptAt: body.reattemptAt,
    });
  }

  @Patch(':id/reconcile')
  @ApiOperation({ summary: 'Mark a delivered package as receipt-reconciled' })
  reconcile(@Param('id') id: string, @Request() req: any) {
    return this.packagesService.reconcilePackage(id, req.user.id);
  }
}
