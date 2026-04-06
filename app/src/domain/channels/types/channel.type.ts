import type { User } from "@/domain/user";
import type { IMeeting } from "./meeting.type";
import type { IMessage } from "./message.type";

export type IChannel = {
  id: number;
  type: "direct" | "group" | "multi-direct" | "meeting";
  name?: string;
  image?: string;
  speakingTo: User;
  lastMessage?: IMessage;
  unreadMessagesCount: number;
  meeting: IMeeting | null;
  peers: User[];
};

export type ISearchChannelsAndUsersItem =
  | { kind: "channel"; channel: IChannel }
  | { kind: "user"; user: User };

export type ISearchChannelsAndUsersResponse = {
  items: ISearchChannelsAndUsersItem[];
  total: number;
  page: number;
  limit: number;
};
