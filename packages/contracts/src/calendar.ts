export type ICalendarEventRecurrence =
  | { frequency: "once"; until?: string }
  | { frequency: "daily"; interval?: number; until?: string }
  | {
      frequency: "weekly";
      interval?: number;
      byWeekday?: number[];
      until?: string;
    };

export type ICalendarEvent = {
  id: string;
  occurrenceId: string;
  workspaceId: number;
  createdById: number;
  type: "event" | "meeting";
  startsAt: string;
  endsAt: string;
  title: string;
  description: string;
  isPublic: boolean;
  notifyEnabled: boolean;
  notifyMinutesBefore: number;
  recurrence: ICalendarEventRecurrence;
  payload: Record<string, unknown>;
  participants?: { id: number }[];
};

export type CreateCalendarEventData = {
  workspaceId: number;
  type: "event" | "meeting";
  title: string;
  description?: string;
  /** Ignored for type "event"; meetings use top-level channelId instead. */
  payload?: Record<string, unknown>;
  startsAt: Date;
  endsAt: Date;
  channelId?: number | null;
  isPublic?: boolean;
  notifyEnabled?: boolean;
  notifyMinutesBefore?: number;
  recurrence?: ICalendarEventRecurrence;
  participantIds?: number[];
};
