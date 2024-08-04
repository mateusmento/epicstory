import type { User } from "@/domain/auth";
import type { IMeeting } from "./meeting.type";
import type { IMessage } from "./message.type";

export type IChannel = {
  id: number;
  type: "direct" | "group";
  name?: string;
  image?: string;
  speakingTo: User;
  lastMessage?: IMessage;
  unreadMessagesCount: number;
  meeting: IMeeting | null;
};
