export type InboxMessage = {
  id: number;
  channel: { type: "direct" | "group" };
  sender: { name: string; image: string };
  sentAt: string;
  content: string;
  unreadMessagesCount: number;
};
