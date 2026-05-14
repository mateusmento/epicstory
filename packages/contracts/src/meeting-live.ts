import type { ICalendarEvent } from "./calendar";
import type { IMeeting } from "./channel-message";
import type { IUser } from "./user";

export type LiveScheduledMeeting = {
  meeting: IMeeting;
  calendarEvent: ICalendarEvent;
  participantsPreview: IUser[];
};
