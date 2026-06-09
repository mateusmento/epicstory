import type { IMessage, IMessageSummary } from '@epicstory/contracts';
import type { User } from 'src/auth';
import type { Message } from 'src/channel/domain';

export type IMessageCoreFields = Pick<
  IMessage,
  | 'id'
  | 'content'
  | 'quotedMessageId'
  | 'editedAt'
  | 'isScheduled'
  | 'sentAt'
  | 'senderId'
  | 'sender'
  | 'channelId'
>;

/** Loaded {@link Message} row → {@link IMessage} core fields (no ORM relation graphs). */
export function messageEntityToIMessageCore(
  message: Message,
): IMessageCoreFields {
  return {
    id: message.id,
    content: message.content,
    quotedMessageId: message.quotedMessageId ?? null,
    editedAt: message.editedAt ?? null,
    isScheduled: message.isScheduled,
    sentAt: message.sentAt,
    senderId: message.senderId,
    sender: message.sender,
    channelId: message.channelId,
  };
}

/** Loaded {@link Message} row → {@link IMessageSummary} for channel list previews. */
export function messageEntityToIMessageSummary(
  message: Message,
  options?: {
    displayContent?: string;
    sender?: User;
  },
): IMessageSummary {
  const core = messageEntityToIMessageCore(message);
  return {
    ...core,
    sender: options?.sender ?? core.sender,
    ...(options?.displayContent !== undefined
      ? { displayContent: options.displayContent }
      : {}),
  };
}
