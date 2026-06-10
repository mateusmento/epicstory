import type { JSONContent } from "@tiptap/core";
import type { UploadedAttachment } from "./attachment";
import type { Page } from "./page";
import type { IUser } from "./user";

export type MessagePollOptionBody = {
  id: string;
  label: string;
};

/** Poll question/options on create/update and persisted on `messages.poll` (jsonb). */
export type MessagePollBody = {
  question: string;
  options: MessagePollOptionBody[];
};

/** Vote tallies merged onto {@link MessagePollBody} for message API responses. */
export type MessagePollSummary = {
  optionVotes: Record<string, number>;
  totalVotes: number;
  myOptionId: string | null;
};

export type MessagePollClient = MessagePollBody & MessagePollSummary;

export type IQuotedMessagePreview = {
  id: number;
  sender: IUser;
  content: JSONContent;
  displayContent?: string;
};

export type IMessageAttachment = UploadedAttachment;

export type IReaction = {
  emoji: string;
  reactedBy: IUser;
};

export type IAggregatedReaction = {
  emoji: string;
  reactedBy: IUser[];
  /** Same as persistence / domain: ISO timestamps are applied at the transport layer only. */
  firstReactedAt: Date;
  reactedByMe: boolean;
};

export type IMessageReplier = {
  user: IUser;
  repliesCount: number;
};

export type ChannelType =
  | "direct"
  | "multi-direct"
  | "group"
  | "meeting"
  | "workspace_open";

export type IChannel = {
  id: number;
  type: ChannelType;
  name: string;
  image?: string;
  workspaceId: number;
  teamId?: number;
  createdAt: Date;
  directPeer?: IUser;
  lastMessage?: IMessageSummary;
  unreadMessagesCount: number;
  meeting: IMeeting | null;
  peers: IUser[];
};

export type IMeetingAttendee = {
  remoteId: string;
  user: IUser;
  isCameraOn: boolean;
  isMicrophoneOn: boolean;
  isScreenSharing?: boolean;
};

export type IMeeting = {
  id: number;
  channelId?: number | null;
  workspaceId?: number;
  attendees: IMeetingAttendee[];
  ongoing: boolean;
  startedAt: Date;
  endedAt: Date | null;
  calendarEventId?: string | null;
  scheduledStartsAt?: Date | null;
  scheduledEndsAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type IMessage = {
  id: number;
  content: JSONContent;
  displayContent?: string;
  quotedMessageId?: number | null;
  quotedMessage?: IQuotedMessagePreview;
  editedAt?: Date | null;
  isScheduled?: boolean;
  mentionedUsers?: IUser[];
  sentAt: Date;
  senderId: number;
  sender: IUser;
  channelId: number;
  /** Omitted in some list payloads to avoid heavy circular nesting. */
  channel?: IChannel;
  repliesCount: number;
  repliers: IMessageReplier[];
  reactions: IAggregatedReaction[];
  attachments?: IMessageAttachment[];
  poll?: MessagePollClient;
};

export type IMessageSummary = Pick<
  IMessage,
  | "id"
  | "content"
  | "displayContent"
  | "quotedMessageId"
  | "editedAt"
  | "isScheduled"
  | "sentAt"
  | "senderId"
  | "sender"
  | "channelId"
>;

export type IReply = {
  id: number;
  content: JSONContent;
  displayContent?: string;
  quotedReplyId?: number | null;
  quotedMessage?: IQuotedMessagePreview;
  mentionedUsers?: IUser[];
  isScheduled?: boolean;
  sentAt: Date;
  senderId: number;
  sender: IUser;
  channelId: number;
  channel?: IChannel;
  messageId: number;
  repliesCount: number;
  repliers: IMessageReplier[];
  reactions: IAggregatedReaction[];
  attachments?: IMessageAttachment[];
};

export type FindMessageReplies = {
  full?: boolean;
  limit?: number;
  beforeSentAt?: string;
  beforeId?: number;
};

export type ISearchChannelsAndUsersItem =
  | { kind: "channel"; channel: IChannel }
  | { kind: "user"; user: IUser };

export type ChannelGroupsPage = {
  groupChannels: Page<IChannel>;
  meetingChannels: Page<IChannel>;
  directChannels: Page<IChannel>;
};
