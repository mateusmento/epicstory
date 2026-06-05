import { IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';

export class CalendarEventPayload {
  type: 'event';

  constructor() {
    this.type = 'event';
  }
}

export class ScheduledMeetingPayload {
  type: 'meeting';

  @IsOptional()
  @IsNumber()
  channelId: number | null;

  constructor(data: Partial<Pick<ScheduledMeetingPayload, 'channelId'>> = {}) {
    patch(this, data);
    this.type = 'meeting';
    this.channelId = data.channelId ?? null;
  }
}

export type StoredCalendarEventPayload =
  | CalendarEventPayload
  | ScheduledMeetingPayload;

export function buildCalendarEventPayload(
  type: 'event' | 'meeting',
  options?: { channelId?: number | null },
): StoredCalendarEventPayload {
  switch (type) {
    case 'meeting':
      return new ScheduledMeetingPayload({
        channelId: options?.channelId ?? null,
      });
    case 'event':
    default:
      return new CalendarEventPayload();
  }
}
