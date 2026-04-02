import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsString } from 'class-validator';
import {
  addMilliseconds,
  addMinutes,
  differenceInMilliseconds,
} from 'date-fns';
import { concat, uniq } from 'lodash';
import { CalendarEvent } from 'src/calendar/entities';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import {
  ChannelRepository,
  MeetingRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { NotificationService } from 'src/notifications/services/notification.service';
import { DataSource } from 'typeorm';

export class SendScheduledMeetingReminder {
  @IsString()
  calendarEventId: string;

  @Type(() => Date)
  @IsDate()
  reminderAt: Date;

  @IsNumber()
  notifyMinutesBefore: number;

  constructor(data: Partial<SendScheduledMeetingReminder> = {}) {
    patch(this, data);
  }
}

@CommandHandler(SendScheduledMeetingReminder)
export class SendScheduledMeetingReminderHandler
  implements ICommandHandler<SendScheduledMeetingReminder>
{
  constructor(
    private notificationService: NotificationService,
    private meetingRepo: MeetingRepository,
    private channelRepo: ChannelRepository,
    private dataSource: DataSource,
  ) {}

  async execute(command: SendScheduledMeetingReminder) {
    const calendarRepo = this.dataSource.getRepository(CalendarEvent);

    const event = await calendarRepo.findOne({
      where: { id: command.calendarEventId as any, type: 'meeting' } as any,
      relations: { participants: true } as any,
    });
    if (!event) return;

    const channelId = (event.payload as any)?.channelId ?? null;

    const occurrenceAt = addMinutes(
      command.reminderAt,
      Math.max(0, command.notifyMinutesBefore ?? 0),
    );

    const durationMs = Math.max(
      0,
      differenceInMilliseconds(event.endsAt, event.startsAt),
    );
    const occurrenceEndsAt = addMilliseconds(occurrenceAt, durationMs);

    const channel = channelId
      ? await this.channelRepo.findChannel(channelId, { peers: true })
      : null;
    const channelMembers = channel ? channel.peers.map((u) => u.id) : [];

    const participantIds = event.participants?.map((u) => u.id) ?? [];
    const recipientIds = uniq(
      concat(channelMembers, participantIds, [event.createdById]),
    );

    let meeting = await this.meetingRepo.findScheduled(event.id, occurrenceAt);

    if (!meeting) {
      const created = Meeting.create({
        workspaceId: event.workspaceId,
        channelId,
        calendarEventId: event.id as any,
        scheduledStartsAt: occurrenceAt,
        scheduledEndsAt: occurrenceEndsAt,
        // Keep legacy column aligned for now.
        occurrenceAt: occurrenceAt,
      });
      created.ongoing = false;
      created.startedAt = occurrenceAt;
      meeting = await this.meetingRepo.save(created);
    }

    for (const userId of recipientIds) {
      await this.notificationService.sendNotification({
        type: 'calendar_meeting_reminder',
        userId,
        workspaceId: event.workspaceId,
        payload: {
          calendarEventId: event.id as any,
          occurrenceAt: occurrenceAt,
          meetingId: meeting.id,
          title: event.title,
          channelId,
        },
      });
    }
  }
}
