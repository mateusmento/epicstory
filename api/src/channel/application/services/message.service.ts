import { Injectable } from '@nestjs/common';
import { uniq } from 'lodash';
import { User, UserRepository } from 'src/auth';
import { Channel, Message, MessageReaction } from 'src/channel/domain';
import { MessageReplyReaction } from 'src/channel/domain/entities';
import { mapReactions, mapRepliers } from 'src/channel/domain/utils';
import {
  ChannelRepository,
  MessageReactionRepository,
  MessageReplyReactionRepository,
  MessageReplyRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { create, groupBy, mapBy, patch } from 'src/core/objects';
import { In } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { extractMentionIds, renderMentions } from '../utils/mentions';
import { normalizeTiptapDoc, tiptapToPlainText } from '../utils/tiptap';

export class MessageDto extends Message {
  mentionedUsers?: User[];
  displayContent?: string;

  constructor(data: Partial<MessageDto>) {
    super();
    patch(this, data);
  }
}

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
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
      relations: { peers: true },
    });
    const messages = await this.messageRepo.find({
      where: { channelId },
      relations: { sender: true, allReactions: true },
      order: { sentAt: 'asc' },
    });

    if (messages.length === 0) return [];

    const messageIds = messages.map((m) => m.id);

    const repliesCount = await this.messageRepo.findRepliesCount(messageIds);
    const repliers = await this.replyRepo.findRepliers(messageIds);

    const usersIds = uniq([
      ...repliers.map((r) => r.senderId),
      ...messages.flatMap((m) => m.allReactions.map((r) => r.userId)),
    ]);

    const users = await this.userRepo.find({
      where: { id: In(usersIds) },
    });

    const usersMap = mapBy(users, 'id');
    const repliesCountMap = mapBy(repliesCount, 'messageId');
    const repliersMap = groupBy(repliers, 'messageId');

    const peerUsersMap = mapBy(channel?.peers ?? [], 'id');

    return messages.map((message) => {
      const repliesCount = repliesCountMap.get(message.id)?.repliesCount ?? 0;
      const repliers = mapRepliers(repliersMap[message.id] ?? [], usersMap);
      const reactions = mapReactions(message.allReactions, senderId, usersMap);
      const displayContent = renderMentions(message.content, peerUsersMap);
      const mentionedUsers = extractMentionIds(message.content)
        .map((id) => peerUsersMap.get(id))
        .filter((user) => user);

      return new MessageDto({
        ...message,
        repliesCount,
        repliers,
        reactions,
        displayContent,
        mentionedUsers,
      });
    });
  }

  async createMessage(
    channel: Channel,
    senderId: number,
    content: string,
    contentRich?: any,
  ) {
    const channelId = channel.id;

    const normalizedRich = contentRich
      ? normalizeTiptapDoc(contentRich)
      : undefined;
    const plainContent = normalizedRich
      ? tiptapToPlainText(normalizedRich)
      : content;

    let message = await this.messageRepo.save(
      create(Message, {
        channelId,
        senderId,
        content: plainContent,
        contentRich: normalizedRich,
        sentAt: new Date(),
      }),
    );

    this.channelRepo.update({ id: channelId }, { lastMessageId: message.id });

    message = await this.messageRepo.findOne({
      where: { id: message.id },
      relations: {
        sender: true,
      },
    });

    const peerUsersMap = new Map(channel.peers.map((u) => [u.id, u]));
    const displayContent = renderMentions(plainContent, peerUsersMap);
    const mentionedUsers = extractMentionIds(plainContent)
      .map((id) => peerUsersMap.get(id))
      .filter((user) => user);

    return new MessageDto({
      ...message,
      mentionedUsers,
      displayContent,
    });
  }

  async findReplies(messageId: number, senderId: number) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { channel: { peers: true } },
    });
    const peerUsersMap = new Map(
      (message?.channel?.peers ?? []).map((u) => [u.id, u]),
    );

    const replies = await this.replyRepo.find({
      where: { messageId },
      relations: { sender: true, allReactions: { user: true } },
      order: { sentAt: 'asc' },
    });

    for (const reply of replies) {
      reply.setReactions(senderId);
      const mentionIds = extractMentionIds(reply.content);
      (reply as any).mentionedUsers = mentionIds
        .map((id) => peerUsersMap.get(id))
        .filter(Boolean);
      (reply as any).displayContent = renderMentions(
        reply.content,
        peerUsersMap,
      );
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
