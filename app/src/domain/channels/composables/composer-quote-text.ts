import { TIPTAP_QUOTED_MESSAGE_UI_EXCERPT_MAX, type IMessage, type IReply } from "@epicstory/contracts";
import { messageBodyPlainText, truncatePlainText } from "@epicstory/tiptap";

export function quotedMessageExcerpt(message: IMessage | IReply): string {
  const raw = message.displayContent ?? messageBodyPlainText(message);
  return truncatePlainText(raw, TIPTAP_QUOTED_MESSAGE_UI_EXCERPT_MAX);
}
