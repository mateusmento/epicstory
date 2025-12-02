import { Controller, Get, Param, Put, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FindNotifications, MarkAsSeen } from '../features';

@Controller('notifications')
export class NotificationController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  @Get()
  async getNotifications(@Query() query: FindNotifications) {
    return this.queryBus.execute(query);
  }

  @Put(':id/seen')
  async markAsSeen(@Param('id') notificationId: string) {
    return this.commandBus.execute(new MarkAsSeen({ notificationId }));
  }
}
