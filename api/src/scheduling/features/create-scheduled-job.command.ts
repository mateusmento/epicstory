import { ScheduledJob } from '../entities';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ScheduledJobRepository } from '../repositories';
import { patch } from 'src/core/objects';

export class CreateScheduledJob {
  constructor(data: Partial<CreateScheduledJob>) {
    patch(this, data);
  }
}

@CommandHandler(CreateScheduledJob)
export class CreateScheduledJobCommand
  implements ICommandHandler<CreateScheduledJob>
{
  constructor(
    private readonly scheduledJobRepository: ScheduledJobRepository,
  ) {}

  async execute(command: CreateScheduledJob): Promise<ScheduledJob> {
    const scheduledJob = this.scheduledJobRepository.create(command);
    return this.scheduledJobRepository.save(scheduledJob);
  }
}
