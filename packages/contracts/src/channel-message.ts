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
  firstReactedAt: string;
  reactedByMe: boolean;
};

export type IChannel = {
  id: number;
  type: "direct" | "group" | "multi-direct" | "meeting";
  name?: string;
  image?: string;
  directPeer: IUser;
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
  startedAt: string;
  endedAt: string | null;
  occurrenceAt: string;
  calendarEventId: string;
};

export type IMessage = {
  id: number;
  content: JSONContent;
  displayContent?: string;
  quotedMessageId?: number | null;
  quotedMessage?: IQuotedMessagePreview;
  editedAt?: string | null;
  isScheduled?: boolean;
  mentionedUsers?: IUser[];
  sentAt: string;
  senderId: number;
  sender: IUser;
  channelId: number;
  channel: IChannel;
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
  sentAt: string;
  senderId: number;
  sender: IUser;
  channelId: number;
  channel: IChannel;
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
