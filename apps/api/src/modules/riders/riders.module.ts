import { Module } from '@nestjs/common';
import { RidersController } from './riders.controller';
import { RidersService } from './riders.service';
import { AuditModule } from '../audit/audit.module';

@Module({ imports: [AuditModule], controllers: [RidersController], providers: [RidersService], exports: [RidersService] })
export class RidersModule {}
