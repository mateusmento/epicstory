import { BadRequestException, Injectable } from '@nestjs/common';
import { uniq } from 'lodash';
import { User, UserRepository } from 'src/auth';
import { Channel, Message, MessageReaction } from 'src/channel/domain';
import { MessageReply, MessageReplyReaction } from 'src/channel/domain/entities';
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
import { MessageNotFound } from '../exceptions';
import {
  extractMentionIdsFromDoc,
  normalizeTiptapDoc,
  tiptapToPlainText,
} from '@epicstory/tiptap';
import { extractMentionIds, renderMentions } from '../utils/mentions';

export type MessageReactionsGroup = {
  emoji: string;
  reactedBy: User[];
  firstReactedAt?: Date;
  reactedByMe: boolean;
};

export type QuotedMessagePreview = {
  id: number;
  sender: User;
  content: string;
  contentRich?: any;
  displayContent: string;
};

export class MessageDto extends Message {
  mentionedUsers?: User[];
  displayContent?: string;
  /** Hydrated preview of `quotedMessageId` for clients. */
  quotedMessage?: QuotedMessagePreview;

  repliesCount: number;
  repliers: { user: User; repliesCount: number }[];
  reactions: MessageReactionsGroup[];

  constructor(data: Partial<MessageDto>) {
    super();
    this.reactions = [];
    this.repliesCount = 0;
    this.repliers = [];
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

    const quoteIds = uniq(
      messages
        .map((m) => m.quotedMessageId)
        .filter((id): id is number => id != null),
    );
    const quotedRows =
      quoteIds.length > 0
        ? await this.messageRepo.find({
            where: { id: In(quoteIds) },
            relations: { sender: true },
          })
        : [];
    const quotedById = mapBy(quotedRows, 'id');

    return messages.map((message) => {
      const repliesCount = repliesCountMap.get(message.id)?.repliesCount ?? 0;
      const repliers = mapRepliers(repliersMap[message.id] ?? [], usersMap);
      const reactions = mapReactions(message.allReactions, senderId, usersMap);
      const displayContent = renderMentions(message.content, peerUsersMap);
      const mentionIds = message.contentRich
        ? extractMentionIdsFromDoc(message.contentRich)
        : extractMentionIds(message.content);
      const mentionedUsers = mentionIds
        .map((id) => peerUsersMap.get(id))
        .filter((user) => user);

      const quotedSrc = message.quotedMessageId
        ? quotedById.get(message.quotedMessageId)
        : undefined;

      return new MessageDto({
        ...message,
        repliesCount,
        repliers,
        reactions,
        displayContent,
        mentionedUsers,
        quotedMessage: this.buildQuotedPreview(quotedSrc, peerUsersMap),
      });
    });
  }

  async createMessage(
    channel: Channel,
    senderId: number,
    content: string,
    contentRich?: any,
    quotedMessageId?: number | null,
    options?: { isScheduled?: boolean },
  ) {
    const channelId = channel.id;

    const resolvedQuote = await this.resolveQuotedMessageId(
      quotedMessageId,
      channelId,
    );

    const normalizedRich = contentRich
      ? normalizeTiptapDoc(contentRich)
      : undefined;
    const plainContent = normalizedRich
      ? tiptapToPlainText(normalizedRich, { stripFormatting: true })
      : content;

    let message = await this.messageRepo.save(
      create(Message, {
        channelId,
        senderId,
        content: plainContent,
        contentRich: normalizedRich,
        sentAt: new Date(),
        quotedMessageId: resolvedQuote,
        isScheduled: options?.isScheduled === true,
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
    const mentionIds = normalizedRich
      ? extractMentionIdsFromDoc(normalizedRich)
      : extractMentionIds(plainContent);
    const mentionedUsers = mentionIds
      .map((id) => peerUsersMap.get(id))
      .filter((user) => user);

    let quotedPreview: QuotedMessagePreview | undefined;
    if (resolvedQuote) {
      const q = await this.messageRepo.findOne({
        where: { id: resolvedQuote },
        relations: { sender: true },
      });
      quotedPreview = this.buildQuotedPreview(q, peerUsersMap);
    }

    return new MessageDto({
      ...message,
      mentionedUsers,
      displayContent,
      quotedMessage: quotedPreview,
    });
  }

  /**
   * Validates that a quoted message exists and belongs to the same channel.
   * Used by {@link createMessage} and reply creation.
   */
  async resolveQuotedMessageId(
    quotedMessageId: number | null | undefined,
    channelId: number,
  ): Promise<number | null> {
    if (quotedMessageId == null) return null;
    const target = await this.messageRepo.findOne({
      where: { id: quotedMessageId },
    });
    if (!target) {
      throw new BadRequestException('Quoted message not found');
    }
    if (target.channelId !== channelId) {
      throw new BadRequestException(
        'Quoted message must belong to this channel',
      );
    }
    return quotedMessageId;
  }

  /**
   * Validates a quoted thread reply: same channel and same thread (`message` root) as the new reply.
   */
  async resolveQuotedReplyId(
    quotedReplyId: number | null | undefined,
    threadMessageId: number,
    channelId: number,
  ): Promise<number | null> {
    if (quotedReplyId == null) return null;
    const target = await this.replyRepo.findOne({
      where: { id: quotedReplyId },
      relations: { message: true },
    });
    if (!target) {
      throw new BadRequestException('Quoted reply not found');
    }
    if (target.channelId !== channelId) {
      throw new BadRequestException('Quoted reply must belong to this channel');
    }
    if (target.messageId !== threadMessageId) {
      throw new BadRequestException('Quoted reply must belong to this thread');
    }
    return quotedReplyId;
  }

  buildQuotedPreview(
    m: Message | null | undefined,
    peerUsersMap: Map<number, User>,
  ): QuotedMessagePreview | undefined {
    if (!m?.sender) return undefined;
    return {
      id: m.id,
      sender: m.sender,
      content: m.content,
      contentRich: m.contentRich,
      displayContent: renderMentions(m.content, peerUsersMap),
    };
  }

  buildQuotedPreviewFromReply(
    r: MessageReply | null | undefined,
    peerUsersMap: Map<number, User>,
  ): QuotedMessagePreview | undefined {
    if (!r?.sender) return undefined;
    return {
      id: r.id,
      sender: r.sender,
      content: r.content,
      contentRich: r.contentRich,
      displayContent: renderMentions(r.content, peerUsersMap),
    };
  }

  async updateMessageBody(
    channel: Channel,
    messageId: number,
    content: string,
    contentRich: any | undefined,
    viewerId: number,
  ) {
    const normalizedRich = contentRich
      ? normalizeTiptapDoc(contentRich)
      : undefined;
    const plainContent = normalizedRich
      ? tiptapToPlainText(normalizedRich, { stripFormatting: true })
      : content;

    await this.messageRepo.update(
      { id: messageId },
      {
        content: plainContent,
        contentRich: (normalizedRich ?? null) as any,
        editedAt: new Date(),
      },
    );

    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { sender: true, allReactions: { user: true } },
    });
    if (!message) throw new MessageNotFound();

    const peerUsersMap = new Map(channel.peers.map((u) => [u.id, u]));
    const displayContent = renderMentions(plainContent, peerUsersMap);
    const mentionIds = normalizedRich
      ? extractMentionIdsFromDoc(normalizedRich)
      : extractMentionIds(plainContent);
    const mentionedUsers = mentionIds
      .map((id) => peerUsersMap.get(id))
      .filter((user) => user);

    const repliesCountRows = await this.messageRepo.findRepliesCount([
      messageId,
    ]);
    const repliesCount = repliesCountRows[0]?.repliesCount ?? 0;
    const repliersRaw = await this.replyRepo.findRepliers([messageId]);
    const usersIds = uniq([
      ...repliersRaw.map((r) => r.senderId),
      ...message.allReactions.map((r) => r.userId),
    ]);
    const users = await this.userRepo.find({
      where: { id: In(usersIds) },
    });
    const usersMap = mapBy(users, 'id');
    const repliersMap = groupBy(repliersRaw, 'messageId');
    const repliers = mapRepliers(repliersMap[messageId] ?? [], usersMap);
    const reactions = mapReactions(message.allReactions, viewerId, usersMap);

    return new MessageDto({
      ...message,
      repliesCount,
      repliers,
      reactions,
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

    const replyQuoteIds = uniq(
      replies
        .map((r) => r.quotedReplyId)
        .filter((id): id is number => id != null),
    );
    const replyQuotedRows =
      replyQuoteIds.length > 0
        ? await this.replyRepo.find({
            where: { id: In(replyQuoteIds) },
            relations: { sender: true },
          })
        : [];
    const replyQuotedById = mapBy(replyQuotedRows, 'id');

    for (const reply of replies) {
      reply.setReactions(senderId);
      const mentionIds = reply.contentRich
        ? extractMentionIdsFromDoc(reply.contentRich)
        : extractMentionIds(reply.content);
      (reply as any).mentionedUsers = mentionIds
        .map((id) => peerUsersMap.get(id))
        .filter(Boolean);
      (reply as any).displayContent = renderMentions(
        reply.content,
        peerUsersMap,
      );
      const qSrc = reply.quotedReplyId
        ? replyQuotedById.get(reply.quotedReplyId)
        : undefined;
      (reply as any).quotedMessage = this.buildQuotedPreviewFromReply(
        qSrc,
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
