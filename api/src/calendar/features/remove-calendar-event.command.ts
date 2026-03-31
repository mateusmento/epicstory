import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { CalendarEventRepository } from '../repositories';
import { ScheduledJobRepository } from 'src/scheduling/repositories';

export class RemoveCalendarEvent {
  @IsString()
  id: string;

  userId: number;

  constructor(data: Partial<RemoveCalendarEvent>) {
    patch(this, data);
  }
}

@CommandHandler(RemoveCalendarEvent)
export class RemoveCalendarEventCommand
  implements ICommandHandler<RemoveCalendarEvent>
{
  constructor(
    private calendarEventRepo: CalendarEventRepository,
    private workspaceRepo: WorkspaceRepository,
    private scheduledJobRepo: ScheduledJobRepository,
  ) {}

  async execute(command: RemoveCalendarEvent) {
    const event = await this.calendarEventRepo.findOne({
      where: { id: command.id as any },
    });
    if (!event) throw new BadRequestException('Calendar event not found');
    const member = await this.workspaceRepo.findMember(
      event.workspaceId,
      command.userId,
    );
    if (!member)
      throw new ForbiddenException('Issuer is not a workspace member');
    if (event.createdById !== command.userId) throw new ForbiddenException();

    // Remove reminder job for this series (primary: FK from event -> scheduled job).
    if (event.scheduledJobId) {
      await this.scheduledJobRepo.delete({ id: event.scheduledJobId as any });
    }

    await this.calendarEventRepo.delete({ id: command.id as any });
    return { success: true, id: command.id };
  }
}
