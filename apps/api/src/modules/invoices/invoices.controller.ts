import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, Res, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvoicesService } from './invoices.service';
import { InvoiceStatus } from '@cityrider/database';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices' })
  findAll(@Query() query: any) { return this.invoicesService.findAll(query); }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice with line items and payments' })
  findOne(@Param('id') id: string) { return this.invoicesService.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Generate invoice for a customer' })
  create(@Body() body: { customerId: string; notes?: string; dueDays?: number }, @Request() req: any) {
    return this.invoicesService.create(body.customerId, req.user.id, { notes: body.notes, dueDays: body.dueDays });
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
  @ApiOperation({ summary: 'Record a payment against an invoice' })
  recordPayment(
    @Param('id') id: string,
    @Body() body: { amount: number; method: string; reference?: string; notes?: string },
    @Request() req: any,
  ) {
    return this.invoicesService.recordPayment(id, body, req.user.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update invoice status (e.g. mark as SENT)' })
  updateStatus(@Param('id') id: string, @Body() body: { status: InvoiceStatus }) {
    return this.invoicesService.updateStatus(id, body.status);
  }
}
