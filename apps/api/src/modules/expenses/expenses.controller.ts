import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, UploadedFile, UseInterceptors, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@cityrider/types';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CEO_EXECUTIVE)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get() findAll(@Query() query: any) { return this.expensesService.findAll(query); }
  @Get('categories') getCategories() { return this.expensesService.getCategories(); }
  @Post() @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT) @UseInterceptors(FileInterceptor('receipt', { limits: { fileSize: 10 * 1024 * 1024 } })) create(@Body() dto: any, @UploadedFile() receipt: Express.Multer.File, @Request() req: any) { return this.expensesService.create(dto, req.user.id, receipt); }
  @Get(':id/receipt') async getReceipt(@Param('id') id: string, @Res() response: Response) {
    const receipt = await this.expensesService.getReceipt(id);
    response.set({ 'Content-Type': receipt.mimeType, 'Content-Disposition': `inline; filename="${receipt.filename.replace(/["\\\r\n]/g, '_')}"`, 'Content-Length': receipt.data.length, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(receipt.data);
  }
  @Patch(':id/approve') @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER) approve(@Param('id') id: string, @Request() req: any) { return this.expensesService.approve(id, req.user.id); }
  @Patch(':id/reject') @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER) reject(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) { return this.expensesService.reject(id, req.user.id, reason); }
}
