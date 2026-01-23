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
    return this.messageRepo.find({
      where: { channelId: channelId },
      relations: { sender: true },
      order: { sentAt: 'asc' },
    });
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
    return this.messageReplyRepo.find({
      where: { messageId },
      relations: { sender: true },
      order: { sentAt: 'asc' },
    });
  }

  async findMessageReactions(messageId: number) {
    const reactions = await this.messageReactionRepo.find({
      where: { messageId },
      relations: { user: true },
    });

    // Group reactions by emoji
    const grouped = reactions.reduce(
      (acc, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = [];
        }
        acc[reaction.emoji].push(reaction.userId);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    return Object.entries(grouped).map(([emoji, reactedBy]) => ({
      emoji,
      reactedBy,
    }));
  }

  async findReplyReactions(messageReplyId: number) {
    const reactions = await this.messageReplyReactionRepo.find({
      where: { messageReplyId },
      relations: { user: true },
    });

    // Group reactions by emoji
    const grouped = reactions.reduce(
      (acc, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = [];
        }
        acc[reaction.emoji].push(reaction.userId);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    return Object.entries(grouped).map(([emoji, reactedBy]) => ({
      emoji,
      reactedBy,
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

    return { action: 'added' as const };
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

    return { action: 'added' as const };
  }
}
