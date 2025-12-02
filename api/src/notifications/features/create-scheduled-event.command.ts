import { IsDate, IsNumber, IsObject } from 'class-validator';
import { patch } from 'src/core/objects';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ScheduledEventRepository } from '../repositories';
import { ScheduledEvent } from '../entities';

export class CreateScheduledEvent {
  @IsNumber()
  userId: number;

  @IsObject()
  payload: any;

  @IsDate()
  dueAt: Date;

  constructor(data: Partial<CreateScheduledEvent>) {
    patch(this, data);
  }
}

@CommandHandler(CreateScheduledEvent)
export class CreateScheduledEventCommand
  implements ICommandHandler<CreateScheduledEvent>
{
  constructor(private scheduledEventRepo: ScheduledEventRepository) {}

  async execute(command: CreateScheduledEvent): Promise<ScheduledEvent> {
    const scheduledEvent = ScheduledEvent.create({
      userId: command.userId,
      payload: command.payload,
      dueAt: command.dueAt,
    });
    return this.scheduledEventRepo.save(scheduledEvent);
  }
}
