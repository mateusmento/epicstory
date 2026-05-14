import type { JSONContent } from "@tiptap/core";
import type { MessagePollBody } from "./channel-message";

export type ScheduledMessageRecurrence =
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

export type IScheduledMessage = {
  id: string;
  channelId: number;
  senderId: number;
  content: JSONContent;
  quotedMessageId?: number;
  poll?: MessagePollBody;
  dueAt: string;
  recurrence: ScheduledMessageRecurrence;
  notifyMinutesBefore: number;
  processed: boolean;
  lastRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateScheduledMessageBody = {
  content: JSONContent;
  quotedMessageId?: number;
  poll?: MessagePollBody;
  dueAt: string;
  recurrence: ScheduledMessageRecurrence;
};

export type UpdateScheduledMessageBody = {
  content?: JSONContent;
  quotedMessageId?: number;
  poll?: MessagePollBody | null;
  dueAt?: string;
  recurrence?: ScheduledMessageRecurrence;
};
