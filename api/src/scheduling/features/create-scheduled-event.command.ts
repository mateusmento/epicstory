import { IsDate, IsNumber, IsObject } from 'class-validator';
import { patch } from 'src/core/objects';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ScheduledJobRepository } from '../repositories';
import { Recurrence, ScheduledJob } from '../entities';

export class CreateScheduledJob {
  @IsNumber()
  type: string;

  @IsNumber()
  workspaceId: number;

  @IsObject()
  payload: any;

  @IsDate()
  dueAt: Date;

  @IsNumber()
  notifyMinutesBefore: number;

  @IsObject()
  recurrence: Recurrence;

  constructor(data: Partial<CreateScheduledJob>) {
    patch(this, data);
  }
}

@CommandHandler(CreateScheduledJob)
export class CreateScheduledJobCommand
  implements ICommandHandler<CreateScheduledJob>
{
  constructor(private scheduledJobRepo: ScheduledJobRepository) {}

  async execute(command: CreateScheduledJob): Promise<ScheduledJob> {
    const scheduledJob = ScheduledJob.create({
      type: command.type ?? 'scheduled_job',
      workspaceId: command.workspaceId,
      payload: command.payload,
      dueAt: command.dueAt,
      notifyMinutesBefore: command.notifyMinutesBefore,
      recurrence: command.recurrence,
    });
    return this.scheduledJobRepo.save(scheduledJob);
  }
}
