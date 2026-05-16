import type { Message } from '../entities/message.entity';
import type { MessageReply } from '../entities/message-reply.entity';

/** Pure quoting/thread invariants — map to HTTP in application via `rethrowQuotedRuleAsBadRequest`. */
export class QuotedContentRuleError extends Error {
  override readonly name = 'QuotedContentRuleError';

  constructor(message: string) {
    super(message);
  }
}

/** Loaded quoted parent message must exist and live in the same channel as the new message. */
export function assertQuotedParentMessageInChannel(
  target: Pick<Message, 'channelId'> | null | undefined,
  channelId: number,
): asserts target is Pick<Message, 'channelId'> {
  if (target == null) {
    throw new QuotedContentRuleError('Quoted message not found');
  }
  if (target.channelId !== channelId) {
    throw new QuotedContentRuleError(
      'Quoted message must belong to this channel',
    );
  }
}

/** Loaded quoted reply must exist, same channel, and same thread root as the new reply. */
export function assertQuotedReplyInThread(
  target: Pick<MessageReply, 'channelId' | 'messageId'> | null | undefined,
  channelId: number,
  threadMessageId: number,
): asserts target is Pick<MessageReply, 'channelId' | 'messageId'> {
  if (target == null) {
    throw new QuotedContentRuleError('Quoted reply not found');
  }
  if (target.channelId !== channelId) {
    throw new QuotedContentRuleError(
      'Quoted reply must belong to this channel',
    );
  }
  if (target.messageId !== threadMessageId) {
    throw new QuotedContentRuleError('Quoted reply must belong to this thread');
  }
}
