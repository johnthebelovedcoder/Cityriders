import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerPricingService } from './customer-pricing.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({ imports: [NotificationsModule], controllers: [CustomersController], providers: [CustomersService, CustomerPricingService], exports: [CustomersService] })
export class CustomersModule {}
