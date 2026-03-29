import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';

export type CalendarEventPayload = Record<string, unknown> & {
  // stored on the calendar event itself (not on the scheduled job payload)
  channelId: number | null;
  type?: string;
  endTime?: string; // "HH:mm" (UI convenience)
  seriesId?: string; // set when expanding series
};

export class CalendarMeetingReminderPayload {
  @IsNotEmpty()
  calendarEventId: string;

  @IsOptional()
  @IsNumber()
  channelId?: number;

  constructor(data: Partial<CalendarMeetingReminderPayload>) {
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
