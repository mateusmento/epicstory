import type { User } from "../user";

export type Message = {
  id: number;
  sender: User;
  sentAt: string;
  content: string;
  unreadMessagesCount: number;
};

export type Channel = {
  id: number;
  type: "direct" | "group";
  name?: string;
  image?: string;
  speakingTo: User;
  lastMessage: Message;
};
