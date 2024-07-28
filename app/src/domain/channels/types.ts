export type Message = {
  id: number;
  sender: { name: string; image: string };
  sentAt: string;
  content: string;
  unreadMessagesCount: number;
};

export type Channel = {
  id: number;
  type: "direct" | "group";
  name?: string;
  image?: string;
  lastMessage: Message;
};
