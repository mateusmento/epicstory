import { Injectable } from '@nestjs/common';
import { minBy, sortBy, uniq } from 'lodash';
import { User, UserRepository } from 'src/auth';
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
import { In } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private replyRepo: MessageReplyRepository,
    private messageReactionRepo: MessageReactionRepository,
    private messageReplyReactionRepo: MessageReplyReactionRepository,
    private channelRepo: ChannelRepository,
    private userRepo: UserRepository,
  ) {}

  async findMessages(channelId: number, senderId: number) {
    const messages = await this.messageRepo.find({
      where: { channelId },
      relations: { sender: true, allReactions: true },
      order: { sentAt: 'asc' },
    });

    if (messages.length === 0) return [];

    const messageIds = messages.map((m) => m.id);

    const repliesCount = await this.messageRepo.findRepliesCount(messageIds);
    const repliers = await this.replyRepo.findRepliers(messageIds);

    const usersIdsFromMessages = messages.flatMap((m) =>
      m.allReactions.map((r) => r.userId),
    );
    const usersIds = uniq(
      repliers.map((r) => r.senderId).concat(usersIdsFromMessages),
    );
    const users = await this.userRepo.find({
      where: { id: In(usersIds) },
    });

    const usersMap = new Map(users.map((u) => [u.id, u]));
    const repliesCountMap = groupBy(repliesCount, 'messageId');
    const repliersMap = groupBy(repliers, 'messageId');

    for (const message of messages) {
      message.repliesCount =
        repliesCountMap[message.id]?.[0]?.repliesCount ?? 0;

      message.repliers = mapRepliers(repliersMap[message.id] ?? [], usersMap);
      message.reactions = mapReactions(
        message.allReactions,
        senderId,
        usersMap,
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

  async findReplies(messageId: number, senderId: number) {
    const replies = await this.replyRepo.find({
      where: { messageId },
      relations: { sender: true, allReactions: { user: true } },
      order: { sentAt: 'asc' },
    });

    for (const reply of replies) {
      reply.setReactions(senderId);
    }

    return replies;
  }

  async findMessageReactions(messageId: number, senderId: number) {
    const reactions = await this.messageReactionRepo.find({
      where: { messageId },
      relations: { user: true },
    });

    return mapReactions(reactions, senderId);
  }

  async findReplyReactions(messageReplyId: number, senderId: number) {
    const reactions = await this.messageReplyReactionRepo.find({
      where: { messageReplyId },
      relations: { user: true },
    });

    return mapReactions(reactions, senderId);
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

    if (removed.affected > 0) {
      return {
        action: 'removed' as const,
        reactions: await this.findMessageReactions(messageId, userId),
      };
    }

    // Add if it doesn't exist. Requires a unique constraint on (messageId, emoji, userId)
    // to be race-safe under concurrency.
    await this.messageReactionRepo
      .createQueryBuilder()
      .insert()
      .into(MessageReaction)
      .values({ messageId, emoji, userId, reactedAt: new Date() })
      .orIgnore()
      .execute();

    return {
      action: 'added' as const,
      reactions: await this.findMessageReactions(messageId, userId),
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

    if (removed.affected > 0) {
      return {
        action: 'removed' as const,
        reactions: await this.findReplyReactions(messageReplyId, userId),
      };
    }

    await this.messageReplyReactionRepo
      .createQueryBuilder()
      .insert()
      .into(MessageReplyReaction)
      .values({ messageReplyId, emoji, userId, reactedAt: new Date() })
      .orIgnore()
      .execute();

    return {
      action: 'added' as const,
      reactions: await this.findReplyReactions(messageReplyId, userId),
    };
  }
}

function mapRepliers(
  repliers: { senderId: number; repliesCount: number }[],
  usersMap: Map<number, User>,
) {
  return sortBy(repliers, ['repliesCount', 'senderId'])
    .reverse()
    .map((r) => ({
      user: usersMap.get(r.senderId),
      repliesCount: r.repliesCount,
    }));
}

type Reaction = {
  emoji: string;
  reactedAt: Date;
  userId: number;
  user: User;
};

function mapReactions(
  reactions: Reaction[],
  senderId: number,
  usersMap?: Map<number, User>,
) {
  const grouped = groupBy(reactions, 'emoji');
  const aggregatedReactions = Object.entries(grouped).map(
    ([emoji, reactions]) => ({
      emoji,
      reactedBy: reactions.map((r) =>
        usersMap ? usersMap.get(r.userId) : r.user,
      ),
      firstReactedAt: minBy(
        reactions.map((r) => r.reactedAt),
        (d) => d.getTime(),
      ),
      reactedByMe: reactions.some((r) => r.userId === senderId),
    }),
  );

  return sortBy(aggregatedReactions, ['firstReactedAt']);
}
