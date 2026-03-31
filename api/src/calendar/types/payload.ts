import { IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';

export type CalendarEventPayload = {
  type: string;
};

export class MeetingCalendarEventPayload {
  type: 'meeting';

  @IsOptional()
  @IsNumber()
  channelId: number | null;

  constructor(data: Partial<MeetingCalendarEventPayload>) {
    patch(this, data);
    this.type = 'meeting';
  }
}

export function buildCalendarEventPayload(
  type: 'event' | 'meeting',
  payload?: Record<string, unknown>,
): CalendarEventPayload {
  payload = payload ?? {};
  switch (type) {
    case 'meeting':
      return new MeetingCalendarEventPayload(payload);
    case 'event':
    default:
      return {
        ...payload,
        type: 'event',
      };
  }
}
