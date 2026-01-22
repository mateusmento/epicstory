import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ChannelRepository,
  MessageReactionRepository,
  MessageReplyReactionRepository,
  MessageReplyRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { In, Not } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import {
  ChannelNotFound,
  IssuerCanOnlyDeleteOwnMessages,
  IssuerIsNotChannelMember,
  MessageNotFound,
} from '../exceptions';

export class DeleteMessage {
  messageId: number;
  issuerId: number;

  constructor(data: Partial<DeleteMessage>) {
    patch(this, data);
  }
}

@CommandHandler(DeleteMessage)
export class DeleteMessageCommand implements ICommandHandler<DeleteMessage> {
  constructor(
    private messageRepo: MessageRepository,
    private messageReplyRepo: MessageReplyRepository,
    private messageReactionRepo: MessageReactionRepository,
    private messageReplyReactionRepo: MessageReplyReactionRepository,
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  @Transactional()
  async execute({ messageId, issuerId }: DeleteMessage) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) throw new MessageNotFound();

    const channel = await this.channelRepo.findOne({
      where: { id: message.channelId },
      relations: { peers: true },
    });
    if (!channel) throw new ChannelNotFound();

    const issuerMember = await this.workspaceRepo.findMember(
      channel.workspaceId,
      issuerId,
    );
    if (!issuerMember) throw new IssuerUserIsNotWorkspaceMember();

    const isChannelMember = (channel.peers ?? []).some(
      (p) => p.id === issuerId,
    );
    if (!isChannelMember) throw new IssuerIsNotChannelMember();

    if (message.senderId !== issuerId)
      throw new IssuerCanOnlyDeleteOwnMessages();

    // Delete reply reactions + replies
    const replies = await this.messageReplyRepo.find({
      select: { id: true },
      where: { messageId },
    });
    const replyIds = replies.map((r) => r.id);
    if (replyIds.length) {
      await this.messageReplyReactionRepo.delete({
        messageReplyId: In(replyIds),
      });
      await this.messageReplyRepo.delete({ messageId });
    }

    // Delete message reactions
    await this.messageReactionRepo.delete({ messageId });

    // Update channel.lastMessageId if needed
    if (channel.lastMessageId === messageId) {
      const previousMessage = await this.messageRepo.findOne({
        where: { channelId: channel.id, id: Not(messageId) },
        order: { sentAt: 'DESC' },
      });

      await this.channelRepo.update(
        { id: channel.id },
        { lastMessageId: previousMessage?.id ?? null },
      );
    }

    await this.messageRepo.delete({ id: messageId });

    return { success: true, messageId, channelId: channel.id };
  }
}
