import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { EmployeesController } from './employees.controller';

@Module({
  controllers: [PayrollController, EmployeesController],
  providers: [PayrollService],
})
export class PayrollModule {}
