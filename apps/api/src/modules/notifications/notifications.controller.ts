import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('package-registered')
  @ApiOperation({ summary: 'Report booking-confirmed notification status (notification is fired server-side on package creation)' })
  packageRegistered() {
    return {
      smsSent: this.notifications.isSmsConfigured,
      emailSent: this.notifications.isEmailConfigured,
    };
  }
}
