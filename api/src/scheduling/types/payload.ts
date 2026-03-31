import { IsBoolean, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';
import { ScheduledJob } from '../entities';
import { UUID } from 'crypto';
import { ScheduledJobTypes } from '../constants';

export type ScheduledJobWithPayload<T> = ScheduledJob & {
  payload: T;
};

export type ScheduledJobType = keyof typeof ScheduledJobTypes;

export type ScheduledJobPayload =
  | MeetingReminderPayload
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

  constructor(data: Partial<MeetingReminderPayload>) {
    patch(this, data);
    this.type = 'meeting_reminder';
  }
}

export class CalendarEventReminderPayload {
  type: 'calendar_event_reminder';

  @IsNotEmpty()
  calendarEventId: string;

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
    case 'calendar_event_reminder':
      return new CalendarEventReminderPayload(payload);
    case 'due_issue_reminder':
      return new DueIssueReminderPayload(payload);
    default:
      throw new Error(`Invalid scheduled job type: ${type}`);
  }
}
