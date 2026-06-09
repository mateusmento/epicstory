import type { IMessage, IMessageSummary } from "@epicstory/contracts";

/** Strip a full {@link IMessage} to the shape used on {@link IChannel.lastMessage}. */
export function toMessageSummary(message: IMessage): IMessageSummary {
  return {
    id: message.id,
    content: message.content,
    displayContent: message.displayContent,
    quotedMessageId: message.quotedMessageId ?? null,
    editedAt: message.editedAt ?? null,
    isScheduled: message.isScheduled,
    sentAt: message.sentAt,
    senderId: message.senderId,
    sender: message.sender,
    channelId: message.channelId,
  };
}
