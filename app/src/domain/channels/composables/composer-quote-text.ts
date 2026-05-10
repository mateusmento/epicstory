import { messageBodyPlainText } from "@epicstory/tiptap";
import type { IMessage, IReply } from "@/domain/channels/types/message.type";

export function quotedMessageExcerpt(message: IMessage | IReply): string {
  const raw = message.displayContent ?? messageBodyPlainText(message);
  const t = raw.replace(/\s+/g, " ").trim();
  return t.length > 160 ? `${t.slice(0, 160)}…` : t;
}
