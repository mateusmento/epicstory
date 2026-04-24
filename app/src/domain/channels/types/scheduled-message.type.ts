/** Mirrors API `ScheduledMessageDto` and `ScheduledJobRecurrence` JSON. */
export type IScheduledMessageRecurrence =
  | { frequency: "once" }
  | {
      frequency: "daily";
      interval?: number;
      timeOfDay: string;
      until?: string;
    }
  | {
      frequency: "weekly";
      interval?: number;
      weekdays: number[];
      timeOfDay: string;
      until?: string;
    };

export interface IScheduledMessage {
  id: string;
  channelId: number;
  senderId: number;
  content: string;
  contentRich?: any;
  quotedMessageId?: number;
  dueAt: string;
  recurrence: IScheduledMessageRecurrence;
  notifyMinutesBefore: number;
  processed: boolean;
  lastRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ICreateScheduledMessageBody = {
  content: string;
  contentRich?: any;
  quotedMessageId?: number;
  dueAt: string;
  recurrence: IScheduledMessageRecurrence;
};

export type IUpdateScheduledMessageBody = {
  content?: string;
  contentRich?: any;
  quotedMessageId?: number;
  dueAt?: string;
  recurrence?: IScheduledMessageRecurrence;
};
