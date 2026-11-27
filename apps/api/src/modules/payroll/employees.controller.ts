import { Body, Controller, Delete, Get, Param, Post, Patch, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@cityrider/types';
import { PayrollService } from './payroll.service';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.CEO_EXECUTIVE)
export class EmployeesController {
  constructor(private readonly payroll: PayrollService) {}

  @Get() list() { return this.payroll.listEmployees(); }
  @Post() create(@Body() body: any) { return this.payroll.createEmployee(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.payroll.updateEmployee(id, body); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id') id: string) { return this.payroll.deleteEmployee(id); }
}
