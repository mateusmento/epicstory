import type { IChannelActivity, IMessage, IUser } from "@epicstory/contracts";

export type IMessageGroup<M extends IMessage = IMessage> = {
  id: number;
  senderId: number;
  sender: IUser;
  sentAt: Date;
  messages: M[];
};

export type ChatTimelineItem =
  | { kind: "messages"; group: IMessageGroup }
  | { kind: "activity"; activity: IChannelActivity };

export function buildChatTimeline(activities: IChannelActivity[]): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = [];
  let current: IMessage[] = [];
  let currentSenderId: number | null = null;

  function flushMessages() {
    if (current.length === 0) return;
    const first = current[0];
    items.push({
      kind: "messages",
      group: {
        id: first.id,
        senderId: first.senderId,
        sender: first.sender,
        sentAt: new Date(first.sentAt as unknown as string),
        messages: current,
      },
    });
    current = [];
    currentSenderId = null;
  }

  for (const a of activities) {
    if (a.type === "message_sent" && a.message) {
      const m = a.message;
      if (currentSenderId !== null && m.senderId !== currentSenderId) {
        flushMessages();
      }
      current.push(m);
      currentSenderId = m.senderId;
    } else {
      flushMessages();
      if (a.type === "message_sent" && !a.message) {
        continue;
      }
      items.push({ kind: "activity", activity: a });
    }
  }
  flushMessages();

  return items;
}

export function chatTimelineRowCount(timeline: ChatTimelineItem[]): number {
  return timeline.reduce((n, item) => n + (item.kind === "messages" ? item.group.messages.length : 1), 0);
}
