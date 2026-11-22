import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerPricingService } from './customer-pricing.service';

@Module({ controllers: [CustomersController], providers: [CustomersService, CustomerPricingService], exports: [CustomersService] })
export class CustomersModule {}
