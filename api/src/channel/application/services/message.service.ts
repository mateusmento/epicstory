import { Injectable } from '@nestjs/common';
import { Not } from 'typeorm';
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

  async createReply(content: string, messageId: number, senderId: number) {
    return this.messageReplyRepo.save({
      content,
      messageId,
      senderId,
      sentAt: new Date(),
    });
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

  async findMessageReplyReactions(messageReplyId: number) {
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

  async toggleMessageReplyReaction(
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

  async deleteMessage(messageId: number, userId: number) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('Unauthorized: You can only delete your own messages');
    }

    const channelId = message.channelId;

    // Delete all replies for this message (replies don't have CASCADE delete)
    // Reply reactions will be deleted automatically via CASCADE when replies are deleted
    const replies = await this.messageReplyRepo.find({
      where: { messageId },
    });
    if (replies.length > 0) {
      await this.messageReplyRepo.remove(replies);
    }

    // Message reactions will be deleted automatically via CASCADE when message is deleted

    // Check if this message is the lastMessageId in the channel and update if needed
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
    });

    if (channel && channel.lastMessageId === messageId) {
      // Find the most recent message that is not the one being deleted
      const previousMessage = await this.messageRepo.findOne({
        where: { channelId, id: Not(messageId) },
        order: { sentAt: 'DESC' },
      });

      if (previousMessage) {
        await this.channelRepo.update(
          { id: channelId },
          { lastMessageId: previousMessage.id },
        );
      } else {
        // No other messages, set to null
        await this.channelRepo.update(
          { id: channelId },
          { lastMessageId: null },
        );
      }
    }

    // Delete the message (this will cascade delete message reactions)
    await this.messageRepo.remove(message);
    return { success: true };
  }

  async deleteReply(replyId: number, userId: number) {
    const reply = await this.messageReplyRepo.findOne({
      where: { id: replyId },
    });

    if (!reply) {
      throw new Error('Reply not found');
    }

    if (reply.senderId !== userId) {
      throw new Error('Unauthorized: You can only delete your own replies');
    }

    await this.messageReplyRepo.remove(reply);
    return { success: true };
  }
}
