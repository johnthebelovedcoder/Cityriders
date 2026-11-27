import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, Res, HttpCode, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvoicesService } from './invoices.service';
import { InvoiceStatus } from '@cityrider/database';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@cityrider/types';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CEO_EXECUTIVE)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices' })
  findAll(@Query() query: any) { return this.invoicesService.findAll(query); }

  @Get(':id/payment-proof') listPaymentProofs(@Param('id') id: string) { return this.invoicesService.listPaymentProofs(id); }

  @Post(':id/payment-proof')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadPaymentProof(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Request() req: any) { return this.invoicesService.uploadPaymentProof(id, file, req.user.id); }

  @Get(':id/payment-proof/:proofId/file')
  async paymentProofFile(@Param('id') id: string, @Param('proofId') proofId: string, @Res() res: Response) {
    const file = await this.invoicesService.getPaymentProof(id, proofId);
    res.set({ 'Content-Type': file.mimeType, 'Content-Disposition': `inline; filename="${file.filename.replace(/["\\\r\n]/g, '_')}"`, 'Content-Length': file.data.length, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(file.data);
  }

  @Get('customers/:customerId/statement')
  getCustomerStatement(@Param('customerId') customerId: string) { return this.invoicesService.getCustomerStatement(customerId); }

  @Post('customers/:customerId/adjustments')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT)
  recordCustomerAdjustment(@Param('customerId') customerId: string, @Body() body: { amount: number; reason: string }, @Request() req: any) {
    return this.invoicesService.recordCustomerAdjustment(customerId, body, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice with line items and payments' })
  findOne(@Param('id') id: string) { return this.invoicesService.findOne(id); }

  @Post()
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate invoice for a customer' })
  create(@Body() body: { customerId: string; notes?: string; dueDays?: number; dueDate?: string }, @Request() req: any) {
    return this.invoicesService.create(body.customerId, req.user.id, { notes: body.notes, dueDays: body.dueDays, dueDate: body.dueDate });
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice PDF' })
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.invoicesService.generatePdf(id);
    const invoice = await this.invoicesService.findOne(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post(':id/payments')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Record a payment against an invoice' })
  recordPayment(
    @Param('id') id: string,
    @Body() body: { amount: number; method: string; reference?: string; notes?: string },
    @Request() req: any,
  ) {
    return this.invoicesService.recordPayment(id, body, req.user.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update invoice status (e.g. mark as SENT)' })
  updateStatus(@Param('id') id: string, @Body() body: { status: InvoiceStatus }) {
    return this.invoicesService.updateStatus(id, body.status);
  }
}
