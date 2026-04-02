import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsString } from 'class-validator';
import { addMilliseconds, differenceInMilliseconds } from 'date-fns';
import { CalendarEvent } from 'src/calendar/entities';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import { MeetingRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { DataSource } from 'typeorm';
import { StartMeeting } from './start-meeting.command';

/**
 * Scheduled meeting = calendar-backed meeting occurrence.
 * Ensures the occurrence exists and then starts it (ongoing=true + startedAt + incoming-meeting).
 */
export class StartScheduledMeeting {
  @IsString()
  calendarEventId: string;

  @Type(() => Date)
  @IsDate()
  occurrenceAt: Date; // occurrence start timestamp

  @IsNumber()
  workspaceId: number;

  constructor(data: Partial<StartScheduledMeeting> = {}) {
    patch(this, data);
  }
}

@CommandHandler(StartScheduledMeeting)
export class StartScheduledMeetingHandler
  implements ICommandHandler<StartScheduledMeeting>
{
  constructor(
    private dataSource: DataSource,
    private meetingRepo: MeetingRepository,
    private commandBus: CommandBus,
  ) {}

  async execute(command: StartScheduledMeeting) {
    const calendarRepo = this.dataSource.getRepository(CalendarEvent);
    const event = await calendarRepo.findOne({
      where: {
        id: command.calendarEventId as any,
        workspaceId: command.workspaceId,
        type: 'meeting',
      } as any,
    });
    if (!event) return;

    const channelId = (event.payload as any)?.channelId ?? null;

    const durationMs = Math.max(
      0,
      differenceInMilliseconds(event.endsAt, event.startsAt),
    );
    const scheduledEndsAt = addMilliseconds(command.occurrenceAt, durationMs);

    let meeting = await this.meetingRepo.findScheduled(
      event.id,
      command.occurrenceAt,
    );

    if (!meeting) {
      const created = Meeting.create({
        workspaceId: event.workspaceId,
        channelId,
        calendarEventId: event.id as any,
        scheduledStartsAt: command.occurrenceAt,
        scheduledEndsAt,
        // Keep legacy column aligned for now.
        occurrenceAt: command.occurrenceAt,
      });
      created.ongoing = false;
      created.startedAt = command.occurrenceAt;
      meeting = await this.meetingRepo.save(created);
    }

    await this.commandBus.execute(
      new StartMeeting({
        meetingId: meeting.id,
        startedAt: command.occurrenceAt,
      }),
    );
  }
}
