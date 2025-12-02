import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { NotificationRepository } from '../repositories';

export class MarkAsSeen {
  @IsString()
  notificationId: string;

  constructor(data: Partial<MarkAsSeen>) {
    patch(this, data);
  }
}

@CommandHandler(MarkAsSeen)
export class MarkAsSeenHandler implements ICommandHandler<MarkAsSeen> {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(command: MarkAsSeen): Promise<any> {
    return this.notificationRepository.markAsSeen(command.notificationId);
  }
}
