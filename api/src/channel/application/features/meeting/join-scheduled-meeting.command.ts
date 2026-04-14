import { Injectable } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsString, IsUUID } from 'class-validator';
import { UUID } from 'crypto';
import { addMilliseconds, isFuture } from 'date-fns';
import { CalendarEvent } from 'src/calendar/entities';
import { assertCalendarMeetingAccess } from 'src/calendar/utils/assert-calendar-meeting-access';
import { Meeting } from 'src/channel/domain';
import { MeetingRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { DataSource } from 'typeorm';
import { MeetingHasntStartedException } from '../../exceptions';
import { JoinMeeting } from './join-meeting.command';
import { StartMeeting } from './start-meeting.command';

/**
 * Scheduled meeting = calendar-backed meeting occurrence.
 * Identity: (calendarEventId, occurrenceAt[start]).
 */
export class JoinScheduledMeeting {
  issuerId: number;

  @IsUUID()
  calendarEventId: UUID;

  @Type(() => Date)
  @IsDate()
  occurrenceAt: Date; // occurrence start timestamp

  @IsString()
  remoteId: string;

  @IsBoolean()
  isCameraOn: boolean;

  @IsBoolean()
  isMicrophoneOn: boolean;

  constructor(data: Partial<JoinScheduledMeeting> = {}) {
    patch(this, data);
  }
}

@Injectable()
@CommandHandler(JoinScheduledMeeting)
export class JoinScheduledMeetingHandler
  implements ICommandHandler<JoinScheduledMeeting>
{
  constructor(
    private dataSource: DataSource,
    private workspaceRepo: WorkspaceRepository,
    private meetingRepo: MeetingRepository,
    private commandBus: CommandBus,
  ) {}

  async execute(command: JoinScheduledMeeting): Promise<Meeting> {
    const { issuerId, calendarEventId, occurrenceAt } = command;

    const calendarRepo = this.dataSource.getRepository(CalendarEvent);
    const event = await calendarRepo.findOne({
      where: { id: calendarEventId as any, type: 'meeting' } as any,
      relations: { participants: true } as any,
    });
    if (!event) throw new Error('Calendar event not found');

    const channelId = (event.payload as any)?.channelId ?? null;

    await assertCalendarMeetingAccess({
      dataSource: this.dataSource,
      workspaceRepo: this.workspaceRepo,
      issuerId,
      event,
      channelId,
    });

    let meeting = await this.meetingRepo.findScheduled(event.id, occurrenceAt);

    if (!meeting) {
      const scheduledEndsAt = event.duration()
        ? addMilliseconds(occurrenceAt, event.duration())
        : null;

      meeting = await this.meetingRepo.save(
        Meeting.create({
          workspaceId: event.workspaceId,
          channelId,
          calendarEventId: event.id as any,
          scheduledStartsAt: occurrenceAt,
          scheduledEndsAt,
          // Keep legacy column aligned for now.
          occurrenceAt,
        }),
      );

      // Ensure scheduled meeting is created as NOT ongoing; start happens separately.
      meeting.ongoing = false;
      await this.meetingRepo.update({ id: meeting.id }, { ongoing: false });
    }

    // Joinability: never allow joining before the scheduled start timestamp.
    if (isFuture(occurrenceAt)) {
      throw new MeetingHasntStartedException();
    }

    // If start job didn't run (or user is the first to join), start now.
    if (!meeting.ongoing) {
      await this.commandBus.execute(
        new StartMeeting({ meetingId: meeting.id, startedAt: occurrenceAt }),
      );
    }

    // Delegate attendee logic to the canonical "join existing meeting" command.
    return await this.commandBus.execute(
      new JoinMeeting({
        meetingId: meeting.id,
        issuerId,
        remoteId: command.remoteId,
        isCameraOn: command.isCameraOn,
        isMicrophoneOn: command.isMicrophoneOn,
      }),
    );
  }
}
