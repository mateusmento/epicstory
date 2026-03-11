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
  type: string;

  @IsObject()
  payload: any;

  constructor(data: Partial<SendNotification>) {
    patch(this, data);
  }
}

@CommandHandler(SendNotification)
export class SendNotificationHandler
  implements ICommandHandler<SendNotification>
{
  constructor(private readonly notificationService: NotificationService) {}

  async execute(command: SendNotification): Promise<any> {
    if (Array.isArray(command.userIds)) {
      for (const userId of command.userIds) {
        this.notificationService.sendNotification({
          type: command.type,
          userId,
          workspaceId: command.workspaceId,
          payload: command.payload,
        });
      }
    } else {
      await this.notificationService.sendNotification({
        type: command.type,
        userId: command.userIds,
        workspaceId: command.workspaceId,
        payload: command.payload,
      });
    }
  }
}
