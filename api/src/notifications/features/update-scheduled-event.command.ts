import {
  IsDate,
  IsNumber,
  IsObject,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { patch } from 'src/core/objects';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ScheduledEventRepository } from '../repositories';
import { ScheduledEvent } from '../entities';

export class UpdateScheduledEvent {
  // id is validated by ParseUUIDPipe in the controller, not here
  id: string;

  @IsNumber()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  userId: number;

  @IsOptional()
  @ValidateIf((o) => o.payload !== undefined)
  @IsObject()
  payload?: any;

  @IsOptional()
  @ValidateIf((o) => o.dueAt !== undefined)
  @Type(() => Date)
  @IsDate()
  dueAt?: Date;

  constructor(data: Partial<UpdateScheduledEvent>) {
    patch(this, data);
  }
}

@CommandHandler(UpdateScheduledEvent)
export class UpdateScheduledEventCommand
  implements ICommandHandler<UpdateScheduledEvent>
{
  constructor(private scheduledEventRepo: ScheduledEventRepository) {}

  async execute(command: UpdateScheduledEvent): Promise<ScheduledEvent> {
    const event = await this.scheduledEventRepo.findOne({
      where: { id: command.id as any, userId: command.userId },
    });

    console.log('event', event);

    if (!event) {
      throw new Error('Scheduled event not found');
    }

    if (command.payload !== undefined) {
      event.payload = command.payload;
    }

    if (command.dueAt !== undefined) {
      event.dueAt = command.dueAt;
    }

    return this.scheduledEventRepo.save(event);
  }
}
