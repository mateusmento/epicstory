import type { IReply } from '@epicstory/contracts';
import type { MessageReply } from 'src/channel/domain/entities';

export type IReplyCoreFields = Pick<
  IReply,
  | 'id'
  | 'content'
  | 'quotedReplyId'
  | 'sentAt'
  | 'senderId'
  | 'sender'
  | 'channelId'
  | 'messageId'
>;

/** Loaded {@link MessageReply} row → {@link IReply} core fields (no ORM relation graphs). */
export function replyEntityToIReplyCore(reply: MessageReply): IReplyCoreFields {
  return {
    id: reply.id,
    content: reply.content,
    quotedReplyId: reply.quotedReplyId ?? null,
    sentAt: reply.sentAt,
    senderId: reply.senderId,
    sender: reply.sender,
    channelId: reply.channelId,
    messageId: reply.messageId,
  };
}
