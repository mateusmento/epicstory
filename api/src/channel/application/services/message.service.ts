import { Injectable } from '@nestjs/common';
import {
  ChannelRepository,
  MessageReactionRepository,
  MessageReplyReactionRepository,
  MessageReplyRepository,
  MessageRepository,
} from 'src/channel/infrastructure';

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

  async toggleMessageReaction(
    messageId: number,
    emoji: string,
    userId: number,
  ) {
    const existing = await this.messageReactionRepo.findOne({
      where: { messageId, emoji, userId },
    });

    if (existing) {
      await this.messageReactionRepo.remove(existing);
      return { action: 'removed' };
    } else {
      await this.messageReactionRepo.save({
        messageId,
        emoji,
        userId,
      });
      return { action: 'added' };
    }
  }

  async toggleReplyReaction(
    messageReplyId: number,
    emoji: string,
    userId: number,
  ) {
    const existing = await this.messageReplyReactionRepo.findOne({
      where: { messageReplyId, emoji, userId },
    });

    if (existing) {
      await this.messageReplyReactionRepo.remove(existing);
      return { action: 'removed' };
    } else {
      await this.messageReplyReactionRepo.save({
        messageReplyId,
        emoji,
        userId,
      });
      return { action: 'added' };
    }
  }
}
