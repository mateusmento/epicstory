import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { UUID } from 'crypto';
import { patch } from 'src/core/objects';
import { ScheduledJobTypes } from '../constants';
import { ScheduledJob } from '../entities';

export type ScheduledJobWithPayload<T> = ScheduledJob & {
  payload: T;
};

export type ScheduledJobType = keyof typeof ScheduledJobTypes;

export type ScheduledJobPayload =
  | MeetingReminderPayload
  | MeetingStartPayload
  | CalendarEventReminderPayload
  | DueIssueReminderPayload;

export class MeetingReminderPayload {
  type: 'meeting_reminder';

  @IsNotEmpty()
  calendarEventId: UUID;

  @IsOptional()
  @IsNumber()
  channelId?: number;

  @IsBoolean()
  isPublic: boolean;

  @IsOptional()
  @IsDate()
  scheduledStartsAt?: Date;

  @IsOptional()
  @IsDate()
  scheduledEndsAt?: Date;

  constructor(data: Partial<MeetingReminderPayload>) {
    patch(this, data);
    this.type = 'meeting_reminder';
  }
}

export class MeetingStartPayload {
  type: 'meeting_start';

  @IsUUID()
  calendarEventId: UUID;

  @IsOptional()
  @IsNumber()
  channelId?: number;

  @IsBoolean()
  isPublic: boolean;

  constructor(data: Partial<MeetingStartPayload>) {
    patch(this, data);
    this.type = 'meeting_start';
  }
}

export class CalendarEventReminderPayload {
  type: 'calendar_event_reminder';

  @IsUUID()
  calendarEventId: UUID;

  constructor(data: Partial<CalendarEventReminderPayload>) {
    patch(this, data);
    this.type = 'calendar_event_reminder';
  }
}

export class DueIssueReminderPayload {
  type: 'due_issue_reminder';

  @IsNumber()
  issueId: number;

  constructor(data: Partial<DueIssueReminderPayload>) {
    patch(this, data);
    this.type = 'due_issue_reminder';
  }
}

export function buildScheduledJobPayload(
  type: ScheduledJobType,
  payload: Record<string, unknown> = {},
): ScheduledJobPayload {
  switch (type) {
    case 'meeting_reminder':
      return new MeetingReminderPayload(payload);
    case 'meeting_start':
      return new MeetingStartPayload(payload);
    case 'calendar_event_reminder':
      return new CalendarEventReminderPayload(payload);
    case 'due_issue_reminder':
      return new DueIssueReminderPayload(payload);
    default:
      throw new Error(`Invalid scheduled job type: ${type}`);
  }
}
