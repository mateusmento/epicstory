import { IsDate, IsIn, IsNotEmpty, IsNumber, IsObject } from 'class-validator';
import { patch } from 'src/core/objects';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ScheduledJobRepository } from '../repositories';
import { ScheduledJobRecurrence, ScheduledJob } from '../entities';
import { ScheduledJobType, type ScheduledJobPayload } from '../types';
import { ScheduledJobTypes } from 'src/scheduling/constants';

export class CreateScheduledJob {
  @IsIn(Object.keys(ScheduledJobTypes))
  @IsNotEmpty()
  type: ScheduledJobType;

  @IsNumber()
  workspaceId: number;

  @IsObject()
  payload: ScheduledJobPayload;

  @IsDate()
  dueAt: Date;

  @IsNumber()
  notifyMinutesBefore: number;

  @IsObject()
  recurrence: ScheduledJobRecurrence;

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
      type: command.type,
      workspaceId: command.workspaceId,
      payload: command.payload,
      dueAt: command.dueAt,
      notifyMinutesBefore: command.notifyMinutesBefore,
      recurrence: command.recurrence,
    });
    return this.scheduledJobRepo.save(scheduledJob);
  }
}
