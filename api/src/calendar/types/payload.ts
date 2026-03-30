import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';

export type CalendarEventBasePayload = {
  type?: string;
  [k: string]: unknown;
};

// Payload stored on the calendar event itself.
// `channelId` is meaningful for meeting-type events; other event types may omit it.
export type CalendarMeetingPayload = CalendarEventBasePayload & {
  channelId: number | null;
};

export type CalendarNonMeetingPayload = CalendarEventBasePayload & {
  channelId?: never;
};

export type CalendarEventPayload =
  | CalendarMeetingPayload
  | CalendarNonMeetingPayload;

export class CalendarMeetingPayloadData implements CalendarMeetingPayload {
  channelId: number | null;
  type?: string;
  [k: string]: unknown;

  constructor(data: Partial<CalendarMeetingPayloadData>) {
    patch(this, data);
    // For meeting payload, channelId always exists (can be null).
    this.channelId = data.channelId ?? null;
    // Keep stable for older clients relying on payload.type.
    this.type = this.type ?? 'calendar_event';
  }
}

export class CalendarNonMeetingPayloadData
  implements CalendarNonMeetingPayload
{
  type?: string;
  channelId?: never;
  [k: string]: unknown;

  constructor(data: Partial<CalendarNonMeetingPayloadData>) {
    patch(this, data);
    // Keep stable for older clients relying on payload.type.
    this.type = this.type ?? 'calendar_event';
    // Ensure channelId never leaks into non-meeting payloads.
    delete (this as any).channelId;
  }
}

export function buildCalendarEventPayload(args: {
  eventType: 'event' | 'meeting';
  payload: Partial<Record<string, unknown>> | null | undefined;
  channelId?: number | null | undefined;
}): CalendarEventPayload {
  const base = { ...(args.payload ?? {}) } as any;
  switch (args.eventType) {
    case 'meeting':
      return new CalendarMeetingPayloadData({
        ...base,
        channelId: args.channelId ?? base.channelId ?? null,
      });
    case 'event':
    default:
      return new CalendarNonMeetingPayloadData(base);
  }
}

// Scheduled-job payload for meeting reminders (NOT CalendarEvent.payload).
export class CalendarMeetingEventPayload {
  @IsNotEmpty()
  calendarEventId: string;

  @IsOptional()
  @IsNumber()
  channelId?: number;

  constructor(data: Partial<CalendarMeetingEventPayload>) {
    patch(this, data);
  }
}

export class CalendarEventReminderPayload {
  @IsNotEmpty()
  calendarEventId: string;

  constructor(data: Partial<CalendarEventReminderPayload>) {
    patch(this, data);
  }
}
