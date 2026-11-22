import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PackagesModule } from './modules/packages/packages.module';
import { CustomersModule } from './modules/customers/customers.module';
import { RidersModule } from './modules/riders/riders.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { RecipientsModule } from './modules/recipients/recipients.module';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './modules/settings/settings.module';
import { PaystackModule } from './modules/paystack/paystack.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { PortalModule } from './modules/portal/portal.module';
import { CustomerServiceModule } from './modules/customer-service/customer-service.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { SearchModule } from './modules/search/search.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    PackagesModule,
    CustomersModule,
    RidersModule,
    AssignmentsModule,
    DeliveriesModule,
    TrackingModule,
    PaymentsModule,
    ExpensesModule,
    ReportsModule,
    DashboardModule,
    RecipientsModule,
    SettingsModule,
    PaystackModule,
    NotificationsModule,
    DispatchModule,
    InvoicesModule,
    AccountingModule,
    PortalModule,
    CustomerServiceModule,
    PayrollModule,
    VehiclesModule,
    SearchModule,
    MaintenanceModule,
    AuditModule,
  ],
})
export class AppModule {}
