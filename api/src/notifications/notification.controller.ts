import { Controller, Get, Param, Query } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationRepo: NotificationRepository) {}

  @Get()
  async getNotifications(
    @Query('userId') userId: number,
    @Query('limit') limit?: number,
  ) {
    if (!userId) {
      return [];
    }
    return this.notificationRepo.findForUser(userId, limit);
  }

  @Get(':id/seen')
  async markAsSeen(@Param('id') id: string) {
    await this.notificationRepo.markAsSeen(id);
    return { success: true };
  }
}
