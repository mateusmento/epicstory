import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { ScheduledEventRepository } from '../repositories';

export class RemoveScheduledEvent {
  @IsString()
  id: string;

  userId: number;

  constructor(data: Partial<RemoveScheduledEvent>) {
    patch(this, data);
  }
}

@CommandHandler(RemoveScheduledEvent)
export class RemoveScheduledEventCommand
  implements ICommandHandler<RemoveScheduledEvent>
{
  constructor(private scheduledEventRepo: ScheduledEventRepository) {}

  async execute(command: RemoveScheduledEvent) {
    const event = await this.scheduledEventRepo.findOne({
      where: { id: command.id as any },
    });
    if (!event) throw new BadRequestException('Scheduled event not found');
    if (event.userId !== command.userId) throw new ForbiddenException();
    if (event.processed)
      throw new BadRequestException('Scheduled event already processed');

    await this.scheduledEventRepo.delete({ id: command.id as any });
    return { success: true, id: command.id };
  }
}
