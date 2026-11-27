import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  listEmployees() {
    return this.prisma.$queryRaw<any[]>`SELECT * FROM "employees" WHERE "isActive" = TRUE ORDER BY "createdAt" DESC`;
  }

  async createEmployee(input: any) {
    const data = this.validateEmployee(input);
    const [employee] = await this.prisma.$queryRaw<any[]>`INSERT INTO "employees" ("id", "name", "email", "phone", "role", "department", "employmentType", "basicSalary", "housingAllowance", "transportAllowance", "ratePerDelivery", "bankName", "accountNumber", "accountHolderName", "pensionPin", "additions") VALUES (${randomUUID()}, ${data.name}, ${data.email}, ${data.phone}, ${data.role}, ${data.department}, ${data.employmentType}, ${data.basicSalary}, ${data.housingAllowance}, ${data.transportAllowance}, ${data.ratePerDelivery}, ${data.bankName}, ${data.accountNumber}, ${data.accountHolderName}, ${data.pensionPin}, ${JSON.stringify(data.additions)}::jsonb) RETURNING *`;
    return employee;
  }

  async updateEmployee(id: string, input: any) {
    const data = this.validateEmployee(input);
    const [employee] = await this.prisma.$queryRaw<any[]>`UPDATE "employees" SET "name" = ${data.name}, "email" = ${data.email}, "phone" = ${data.phone}, "role" = ${data.role}, "department" = ${data.department}, "employmentType" = ${data.employmentType}, "basicSalary" = ${data.basicSalary}, "housingAllowance" = ${data.housingAllowance}, "transportAllowance" = ${data.transportAllowance}, "ratePerDelivery" = ${data.ratePerDelivery}, "bankName" = ${data.bankName}, "accountNumber" = ${data.accountNumber}, "accountHolderName" = ${data.accountHolderName}, "pensionPin" = ${data.pensionPin}, "additions" = ${JSON.stringify(data.additions)}::jsonb, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id} AND "isActive" = TRUE RETURNING *`;
    if (!employee) throw new NotFoundException(`Employee ${id} not found`);
    return employee;
  }

  async deleteEmployee(id: string) {
    const count = await this.prisma.$executeRaw`UPDATE "employees" SET "isActive" = FALSE, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id} AND "isActive" = TRUE`;
    if (!count) throw new NotFoundException(`Employee ${id} not found`);
  }

  private validateEmployee(input: any) {
    if (!input.name?.trim() || !input.email?.trim() || !input.role || !input.department || !input.employmentType) throw new BadRequestException('Name, email, role, department, and employment type are required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) throw new BadRequestException('Enter a valid email address');
    const numeric = ['basicSalary', 'housingAllowance', 'transportAllowance', 'ratePerDelivery'];
    const values: Record<string, number> = {};
    for (const field of numeric) {
      values[field] = Number(input[field] ?? 0);
      if (!Number.isFinite(values[field]) || values[field] < 0) throw new BadRequestException(`${field} must be a non-negative number`);
    }
    const additions = Array.isArray(input.additions) ? input.additions.map((addition: any) => {
      const amount = Number(addition.amount);
      if (!addition.label?.trim() || !Number.isFinite(amount) || amount < 0) throw new BadRequestException('Each addition needs a label and a non-negative amount');
      return { label: addition.label.trim(), amount };
    }) : [];
    return { name: input.name.trim(), email: input.email.trim().toLowerCase(), phone: input.phone || null, role: input.role, department: input.department, employmentType: input.employmentType, ...values, bankName: input.bankName || null, accountNumber: input.accountNumber || null, accountHolderName: input.accountHolderName || null, pensionPin: input.pensionPin || null, additions } as any;
  }

  async getOrGeneratePeriod(period: string) {
    this.validatePeriod(period);
    const records = await this.prisma.$queryRaw<any[]>`SELECT p.*, e."name" AS "employeeName", e."role", e."department", e."employmentType", e."ratePerDelivery", e."bankName", e."accountNumber", COALESCE(e."accountHolderName", e."name") AS "accountHolderName", e."pensionPin" FROM "company_payroll_runs" p JOIN "employees" e ON e."id" = p."employeeId" WHERE p."period" = ${period} ORDER BY e."name"`;
    return this.payrollResponse(period, records);
  }

  async runPayroll(period: string) {
    this.validatePeriod(period);
    const employees = await this.listEmployees();
    const year = Number(period.slice(0, 4));
    const month = Number(period.slice(5, 7));
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    for (const employee of employees) {
      let deliveries = 0;
      if (employee.employmentType === 'RIDER') {
        const rider = await this.prisma.rider.findFirst({ where: { user: { email: employee.email } }, select: { id: true } });
        if (!rider) throw new BadRequestException(`Rider employee ${employee.name} must use the email on their rider profile`);
        if (rider) deliveries = await this.prisma.assignment.count({ where: { riderId: rider.id, package: { status: 'DELIVERED' }, assignedAt: { gte: start, lt: end } } });
      }
      const calculation = this.calculate(employee, 0, deliveries);
      await this.prisma.$executeRaw`INSERT INTO "company_payroll_runs" ("id", "employeeId", "period", "deliveries", "basicPay", "housingAllowance", "transportAllowance", "bonus", "additions", "additionsTotal", "grossPay", "taxPAYE", "pension", "nhf", "netPay", "status") VALUES (${randomUUID()}, ${employee.id}, ${period}, ${deliveries}, ${calculation.basicPay}, ${calculation.housingAllowance}, ${calculation.transportAllowance}, 0, ${JSON.stringify(calculation.additions)}::jsonb, ${calculation.additionsTotal}, ${calculation.grossPay}, ${calculation.taxPAYE}, ${calculation.pension}, ${calculation.nhf}, ${calculation.netPay}, 'PENDING') ON CONFLICT ("employeeId", "period") DO NOTHING`;
    }
    return this.getOrGeneratePeriod(period);
  }

  async markPaid(id: string, paidById: string) {
    const [record] = await this.prisma.$queryRaw<any[]>`UPDATE "company_payroll_runs" SET "status" = 'PAID', "paidAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id} AND "status" <> 'PAID' RETURNING *`;
    if (!record) throw new NotFoundException(`Unpaid payroll record ${id} not found`);
    return record;
  }

  async updateBonus(id: string, bonus: number) {
    if (!Number.isFinite(bonus) || bonus < 0) throw new BadRequestException('Bonus must be a non-negative amount');
    const [record] = await this.prisma.$queryRaw<any[]>`SELECT p.*, e."basicSalary", e."housingAllowance", e."transportAllowance", e."ratePerDelivery", e."employmentType", e."additions" FROM "company_payroll_runs" p JOIN "employees" e ON e."id" = p."employeeId" WHERE p."id" = ${id}`;
    if (!record) throw new NotFoundException(`Payroll record ${id} not found`);
    if (record.status === 'PAID') throw new BadRequestException('A paid payroll entry cannot be edited');
    const calculation = this.calculate({ basicSalary: record.basicSalary, housingAllowance: record.housingAllowance, transportAllowance: record.transportAllowance, ratePerDelivery: record.ratePerDelivery, employmentType: record.employmentType, additions: record.additions }, bonus, Number(record.deliveries ?? 0));
    const [updated] = await this.prisma.$queryRaw<any[]>`UPDATE "company_payroll_runs" SET "bonus" = ${bonus}, "grossPay" = ${calculation.grossPay}, "taxPAYE" = ${calculation.taxPAYE}, "pension" = ${calculation.pension}, "nhf" = ${calculation.nhf}, "netPay" = ${calculation.netPay}, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id} RETURNING *`;
    return updated;
  }

  private payrollResponse(period: string, records: any[]) {
    const sum = (field: string) => records.reduce((total, record) => total + Number(record[field] ?? 0), 0);
    const totalGross = sum('grossPay');
    const totalNet = sum('netPay');
    const paidOut = records.filter((record) => record.status === 'PAID').reduce((total, record) => total + Number(record.netPay), 0);
    return { period, records, summary: { totalGross, totalNet, totalPAYE: sum('taxPAYE'), totalPension: sum('pension'), paidOut, pending: totalNet - paidOut, employeeCount: records.length } };
  }

  private validatePeriod(period: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new BadRequestException('Payroll period must be YYYY-MM');
  }

  private calculate(employee: any, bonus: number, deliveries = 0) {
    const isRider = employee.employmentType === 'RIDER';
    const basicPay = isRider ? deliveries * Number(employee.ratePerDelivery ?? 0) : Number(employee.basicSalary ?? 0);
    const housingAllowance = isRider ? 0 : Number(employee.housingAllowance ?? 0);
    const transportAllowance = isRider ? 0 : Number(employee.transportAllowance ?? 0);
    const additions = Array.isArray(employee.additions) ? employee.additions : [];
    const additionsTotal = additions.reduce((total: number, addition: any) => total + Math.max(0, Number(addition.amount ?? 0)), 0);
    const grossPay = basicPay + housingAllowance + transportAllowance + bonus + additionsTotal;
    const pension = Math.round((basicPay + housingAllowance + transportAllowance) * 0.08);
    const nhf = Math.round(basicPay * 0.025);
    const annualGross = grossPay * 12;
    const cra = Math.max(annualGross * 0.01, 200000) + annualGross * 0.20;
    let taxable = Math.max(annualGross - pension * 12 - nhf * 12 - cra, 0);
    let annualPaye = 0;
    for (const [limit, rate] of [[300000, 0.07], [300000, 0.11], [500000, 0.15], [500000, 0.19], [1600000, 0.21], [Number.POSITIVE_INFINITY, 0.24]] as Array<[number, number]>) {
      if (taxable <= 0) break;
      const band = Math.min(taxable, limit);
      annualPaye += band * rate;
      taxable -= band;
    }
    const taxPAYE = Math.round(annualPaye / 12);
    return { deliveries, basicPay, housingAllowance, transportAllowance, bonus, additions, additionsTotal, grossPay, pension, nhf, taxPAYE, netPay: Math.max(grossPay - pension - nhf - taxPAYE, 0) };
  }
}
