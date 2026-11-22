import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [ConfigModule, MulterModule.register({ storage: undefined }), NotificationsModule, AuditModule, TrackingModule],
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
