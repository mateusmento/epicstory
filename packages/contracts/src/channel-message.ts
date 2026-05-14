import type { JSONContent } from "@tiptap/core";
import type { Page } from "./page";
import type { IUser } from "./user";

export type MessagePollOptionBody = {
  id: string;
  label: string;
};

export type MessagePollBody = {
  question: string;
  options: MessagePollOptionBody[];
};

export type MessagePollClient = MessagePollBody & {
  optionVotes: Record<string, number>;
  totalVotes: number;
  myOptionId: string | null;
};

export type IQuotedMessagePreview = {
  id: number;
  sender: IUser;
  content: JSONContent;
  displayContent?: string;
};

export type IMessageAttachment = {
  id: number;
  url: string;
  mimeType: string;
  originalFilename: string;
  byteSize: number;
  uploadedById?: number;
};

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

export type ChannelType =
  | "direct"
  | "multi-direct"
  | "group"
  | "meeting"
  | "workspace_open";

export type IChannel = {
  id: number;
  type: ChannelType;
  name?: string;
  image?: string;
  workspaceId?: number;
  teamId?: number;
  createdAt?: Date;
  /** Present for direct channels when the payload is enriched for the viewer. */
  directPeer?: IUser;
  lastMessage?: IMessage;
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
  occurrenceAt?: Date | null;
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
  repliers: { user: IUser; repliesCount: number }[];
  reactions: IAggregatedReaction[];
  attachments?: IMessageAttachment[];
  poll?: MessagePollClient;
};

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
  message: IMessage;
  repliesCount: number;
  repliers: { user: IUser; repliesCount: number }[];
  reactions: IAggregatedReaction[];
  attachments?: IMessageAttachment[];
};

export type ISearchChannelsAndUsersItem =
  | { kind: "channel"; channel: IChannel }
  | { kind: "user"; user: IUser };

export type ChannelGroupsPage = {
  groupChannels: Page<IChannel>;
  meetingChannels: Page<IChannel>;
  directChannels: Page<IChannel>;
};
