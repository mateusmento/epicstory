import type { IMessage, IReply } from "./types";

/**
 * `quotedMessageId` on the API always references `messages.id`.
 * When the user quotes a thread reply, we reference the thread root message id.
 */
export function quoteRefMessageId(target: IMessage | IReply): number {
  return "messageId" in target && target.messageId != null ? target.messageId : target.id;
}
