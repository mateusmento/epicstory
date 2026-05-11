import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ChannelRepository,
  MessageReplyReactionRepository,
  MessageReplyRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { Transactional } from 'typeorm-transactional';
import {
  ChannelNotFound,
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
    private channelRepo: ChannelRepository,
    private attachmentService: AttachmentService,
  ) {}

  @Transactional()
  async execute({ replyId, issuerId }: DeleteReply) {
    const reply = await this.messageReplyRepo.findOne({
      where: { id: replyId },
    });
    if (!reply) throw new MessageReplyNotFound();

    if (reply.senderId !== issuerId) throw new IssuerCanOnlyDeleteOwnReplies();

    const channel = await this.channelRepo.findOne({
      where: { id: reply.channelId },
      select: { id: true, workspaceId: true },
    });
    if (!channel) throw new ChannelNotFound();

    await this.attachmentService.deleteAnchoredForDeletedReply({
      workspaceId: channel.workspaceId,
      replyId,
    });

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
