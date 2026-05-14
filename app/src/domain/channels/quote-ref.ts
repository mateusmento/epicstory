import type { IMessage, IReply } from "@epicstory/contracts";

/**
 * Channel **messages** (composer in main view): `quotedMessageId` is `messages.id`.
 * Thread **replies** (composer in thread): `quotedReplyId` is the quoted `IReply.id`.
 */
export function channelComposerQuotedMessageId(target: IMessage): number {
  return target.id;
}

/**
 * `send-message` / scheduled payload: thread quotes use `quotedReplyId`, channel use `quotedMessageId`.
 */
export function composerQuoteRef(
  target: IMessage | IReply,
): { quotedMessageId: number } | { quotedReplyId: number } {
  if ("messageId" in target && target.messageId != null) {
    return { quotedReplyId: target.id };
  }
  return { quotedMessageId: target.id };
}
