import { Injectable } from '@nestjs/common';
import { MessageReaction } from 'src/channel/domain';
import { MessageReplyReaction } from 'src/channel/domain/entities';
import {
  ChannelRepository,
  MessageReactionRepository,
  MessageReplyReactionRepository,
  MessageReplyRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { groupBy } from 'src/core/objects';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private messageReplyRepo: MessageReplyRepository,
    private messageReactionRepo: MessageReactionRepository,
    private messageReplyReactionRepo: MessageReplyReactionRepository,
    private channelRepo: ChannelRepository,
  ) {}

  async findMessages(channelId: number) {
    const messages = await this.messageRepo.find({
      where: { channelId: channelId },
      relations: { sender: true, reactions: { user: true } },
      order: { sentAt: 'asc' },
    });

    for (const message of messages) {
      const grouped = groupBy(message.reactions, 'emoji');

      message.reactionsGroups = Object.entries(grouped).map(
        ([emoji, reactions]) => ({
          emoji,
          reactedBy: reactions.map((reaction) => reaction.user),
        }),
      );
    }

    return messages;
  }

  async createMessage(content: string, channelId: number, senderId: number) {
    const message = await this.messageRepo.save({
      content,
      channelId,
      senderId,
    });
    this.channelRepo.update({ id: channelId }, { lastMessageId: message.id });
    return message;
  }

  async findReplies(messageId: number) {
    const replies = await this.messageReplyRepo.find({
      where: { messageId },
      relations: { sender: true, reactions: { user: true } },
      order: { sentAt: 'asc' },
    });

    for (const reply of replies) {
      const grouped = groupBy(reply.reactions, 'emoji');

      reply.reactionsGroups = Object.entries(grouped).map(
        ([emoji, reactions]) => ({
          emoji,
          reactedBy: reactions.map((reaction) => reaction.user),
        }),
      );
    }

    return replies;
  }

  async findMessageReactions(messageId: number) {
    const reactions = await this.messageReactionRepo.find({
      where: { messageId },
      relations: { user: true },
    });

    // Group reactions by emoji
    const grouped = groupBy(reactions, 'emoji');

    return Object.entries(grouped).map(([emoji, reactions]) => ({
      emoji,
      reactedBy: reactions.map((reaction) => reaction.user),
    }));
  }

  async findReplyReactions(messageReplyId: number) {
    const reactions = await this.messageReplyReactionRepo.find({
      where: { messageReplyId },
      relations: { user: true },
    });

    // Group reactions by emoji
    const grouped = groupBy(reactions, 'emoji');

    return Object.entries(grouped).map(([emoji, reactions]) => ({
      emoji,
      reactedBy: reactions.map((reaction) => reaction.user),
    }));
  }

  @Transactional()
  async toggleMessageReaction(
    messageId: number,
    emoji: string,
    userId: number,
  ) {
    const removed = await this.messageReactionRepo.delete({
      messageId,
      emoji,
      userId,
    });
    if ((removed.affected ?? 0) > 0) return { action: 'removed' as const };

    // Add if it doesn't exist. Requires a unique constraint on (messageId, emoji, userId)
    // to be race-safe under concurrency.
    await this.messageReactionRepo
      .createQueryBuilder()
      .insert()
      .into(MessageReaction)
      .values({ messageId, emoji, userId })
      .orIgnore()
      .execute();

    return {
      action: 'added' as const,
      reactions: await this.findMessageReactions(messageId),
    };
  }

  @Transactional()
  async toggleReplyReaction(
    messageReplyId: number,
    emoji: string,
    userId: number,
  ) {
    const removed = await this.messageReplyReactionRepo.delete({
      messageReplyId,
      emoji,
      userId,
    });
    if ((removed.affected ?? 0) > 0) return { action: 'removed' as const };

    await this.messageReplyReactionRepo
      .createQueryBuilder()
      .insert()
      .into(MessageReplyReaction)
      .values({ messageReplyId, emoji, userId })
      .orIgnore()
      .execute();

    return {
      action: 'added' as const,
      reactions: await this.findReplyReactions(messageReplyId),
    };
  }
}
