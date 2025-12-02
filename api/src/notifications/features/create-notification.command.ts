import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber, IsObject, IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { NotificationRepository } from '../repositories';
import { Notification } from '../entities';

export class CreateNotification {
  @IsNumber()
  userId: number;

  @IsString()
  type: string;

  @IsObject()
  payload: any;

  constructor(data: Partial<CreateNotification>) {
    patch(this, data);
  }
}

@CommandHandler(CreateNotification)
export class CreateNotificationHandler
  implements ICommandHandler<CreateNotification>
{
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(command: CreateNotification): Promise<any> {
    const notification = new Notification({
      userId: command.userId,
      type: command.type,
      payload: command.payload,
    });
    return this.notificationRepository.save(notification);
  }
}
