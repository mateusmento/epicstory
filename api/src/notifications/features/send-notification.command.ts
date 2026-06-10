import type {
  NotificationPayload,
  NotificationType,
} from '@epicstory/contracts';
import type { SendNotificationInput } from '../types/send-notification-input';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsArray, IsNumber, IsObject, IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { NotificationService } from '../services';

export class SendNotification {
  @IsArray()
  @IsNumber({}, { each: true })
  userIds: number[] | number;

  @IsNumber()
  workspaceId: number;

  @IsString()
  type: NotificationType;

  @IsObject()
  payload: NotificationPayload;

  constructor(data: Partial<SendNotification>) {
    patch(this, data);
  }
}

@CommandHandler(SendNotification)
export class SendNotificationHandler
  implements ICommandHandler<SendNotification>
{
  constructor(private readonly notificationService: NotificationService) {}

  async execute(command: SendNotification): Promise<void> {
    const toSend = (userId: number): SendNotificationInput => ({
      type: command.type,
      userId,
      workspaceId: command.workspaceId,
      payload: command.payload,
    });

    if (Array.isArray(command.userIds)) {
      for (const userId of command.userIds) {
        await this.notificationService.sendNotification(toSend(userId));
      }
    } else {
      await this.notificationService.sendNotification(toSend(command.userIds));
    }
  }
}
