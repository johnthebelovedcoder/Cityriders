import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, UploadedFile, UseInterceptors, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@cityrider/types';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CEO_EXECUTIVE)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get() findAll(@Query() query: any) { return this.paymentsService.findAll(query); }
  @Post('settle') @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT) settle() { return this.paymentsService.settle(); }
  @Post() @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT) @UseInterceptors(FileInterceptor('receipt', { limits: { fileSize: 10 * 1024 * 1024 } })) create(@Body() dto: any, @UploadedFile() receipt: Express.Multer.File, @Request() req: any) { return this.paymentsService.create(dto, req.user.id, receipt); }
  @Get(':id/receipt') async getReceipt(@Param('id') id: string, @Res() response: Response) {
    const receipt = await this.paymentsService.getReceipt(id);
    response.set({ 'Content-Type': receipt.mimeType, 'Content-Disposition': `inline; filename="${receipt.filename.replace(/["\\\r\n]/g, '_')}"`, 'Content-Length': receipt.data.length, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(receipt.data);
  }
  @Patch(':id/correct') @Roles(UserRole.ADMINISTRATOR, UserRole.ACCOUNTANT) correct(@Param('id') id: string, @Body() body: any, @Request() req: any) { return this.paymentsService.correct(id, body.amount, body.reason, req.user.id); }
}
