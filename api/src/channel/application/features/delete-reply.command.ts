import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  MessageReplyReactionRepository,
  MessageReplyRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { Transactional } from 'typeorm-transactional';
import {
  IssuerCanOnlyDeleteOwnReplies,
  MessageReplyNotFound,
} from '../exceptions';

export class DeleteReply {
  replyId: number;
  issuerId: number;

  constructor(data: Partial<DeleteReply>) {
    patch(this, data);
  }
}

@CommandHandler(DeleteReply)
export class DeleteReplyCommand implements ICommandHandler<DeleteReply> {
  constructor(
    private messageReplyRepo: MessageReplyRepository,
    private messageReplyReactionRepo: MessageReplyReactionRepository,
  ) {}

  @Transactional()
  async execute({ replyId, issuerId }: DeleteReply) {
    const reply = await this.messageReplyRepo.findOne({
      where: { id: replyId },
    });
    if (!reply) throw new MessageReplyNotFound();

    if (reply.senderId !== issuerId) throw new IssuerCanOnlyDeleteOwnReplies();

    await this.messageReplyReactionRepo.delete({ messageReplyId: replyId });
    await this.messageReplyRepo.remove(reply);
    return {
      success: true,
      replyId,
      channelId: reply.channelId,
      messageId: reply.messageId,
    };
  }
}
