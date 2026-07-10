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

/** Keep first occurrence by activity id, then by messageId for message_sent. */
export function dedupeChannelActivities(activities: IChannelActivity[]): IChannelActivity[] {
  const seenIds = new Set<number>();
  const seenMessageIds = new Set<number>();
  const out: IChannelActivity[] = [];
  for (const a of activities) {
    if (seenIds.has(a.id)) continue;
    if (a.type === "message_sent" && a.messageId != null && seenMessageIds.has(a.messageId)) {
      continue;
    }
    seenIds.add(a.id);
    if (a.type === "message_sent" && a.messageId != null) {
      seenMessageIds.add(a.messageId);
    }
    out.push(a);
  }
  return out;
}

export function buildChatTimeline(activities: IChannelActivity[]): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = [];
  let current: IMessage[] = [];
  let currentSenderId: number | null = null;
  const seenMessageIds = new Set<number>();

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

  for (const a of dedupeChannelActivities(activities)) {
    if (a.type === "message_sent" && a.message) {
      const m = a.message;
      if (seenMessageIds.has(m.id)) continue;
      seenMessageIds.add(m.id);
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

/** Virtualizer row index containing `messageId`, or null if not in the loaded window. */
export function findTimelineIndexForMessageId(
  timeline: ChatTimelineItem[],
  messageId: number,
): number | null {
  for (let i = 0; i < timeline.length; i++) {
    const item = timeline[i];
    if (item.kind !== "messages") continue;
    if (item.group.messages.some((m) => m.id === messageId)) return i;
  }
  return null;
}
