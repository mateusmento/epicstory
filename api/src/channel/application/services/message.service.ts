import { BadRequestException, Injectable } from '@nestjs/common';
import { uniq } from 'lodash';
import { User, UserRepository } from 'src/auth';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Channel, Message, MessageReaction } from 'src/channel/domain';
import {
  MessageReply,
  MessageReplyReaction,
} from 'src/channel/domain/entities';
import { mapReactions, mapRepliers } from 'src/channel/domain/utils';
import {
  ChannelRepository,
  MessageReactionRepository,
  MessageReplyReactionRepository,
  MessageReplyRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { create, groupBy, mapBy, patch } from 'src/core/objects';
import type { CreatedAttachmentDto } from 'src/workspace/application/services/attachment.service';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { In } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { MessageNotFound } from '../exceptions';
import {
  extractMentionIdsFromDoc,
  normalizeTiptapDoc,
  stripImageNodesFromDoc,
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

  /** Linked files (not embedded in `contentRich`; shown below the body in the client). */
  attachments?: CreatedAttachmentDto[];

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
    private workspaceRepo: WorkspaceRepository,
    private attachmentService: AttachmentService,
  ) {}

  /**
   * Mention map for display + validation: peers for normal channels,
   * workspace membership for `workspace_open`.
   */
  async resolveMentionUsersMap(
    channel: Channel | null | undefined,
    candidateUserIds: number[],
  ): Promise<Map<number, User>> {
    const ids = uniq(candidateUserIds.filter(Boolean));
    if (!channel || ids.length === 0) {
      return new Map();
    }
    if (channel.type === 'workspace_open') {
      const workspaceId = channel.workspaceId;
      const members = await this.workspaceRepo.findMembers(
        { workspaceId, userIds: ids },
        { user: true },
      );
      return new Map<number, User>(members.map((u) => [u.userId, u.user]));
    }
    return new Map((channel.peers ?? []).map((u) => [u.id, u]));
  }

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

    return this.enrichMessagesForPreview(messages, channel, senderId);
  }

  /**
   * Channel message list enrichment (quotes, reactions, replies meta, mentions).
   */
  private async enrichMessagesForPreview(
    messages: Message[],
    channel: Channel | null | undefined,
    senderId: number,
  ): Promise<MessageDto[]> {
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

    const allMentionIds = uniq(
      messages.flatMap((message) =>
        message.contentRich
          ? extractMentionIdsFromDoc(message.contentRich)
          : extractMentionIds(message.content),
      ),
    );
    const peerUsersMap = await this.resolveMentionUsersMap(
      channel ?? undefined,
      allMentionIds,
    );

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

    const attachmentsByMessageId = channel
      ? await this.attachmentService.listAnchoredForMessages(
          channel.workspaceId,
          messageIds,
        )
      : new Map<number, CreatedAttachmentDto[]>();

    return messages.map((message) => {
      const rc = repliesCountMap.get(message.id)?.repliesCount ?? 0;
      const reps = mapRepliers(repliersMap[message.id] ?? [], usersMap);
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
        repliesCount: rc,
        repliers: reps,
        reactions,
        displayContent,
        mentionedUsers,
        quotedMessage: this.buildQuotedPreview(quotedSrc, peerUsersMap),
        attachments: attachmentsByMessageId.get(message.id) ?? [],
      });
    });
  }

  /**
   * Load and enrich selected parent messages scoped to `channelId` (same DTO shape as list).
   */
  async findMessagesByIdsForChannel(
    channelId: number,
    messageIds: number[],
    senderId: number,
  ): Promise<Map<number, MessageDto>> {
    const ids = uniq(messageIds.filter(Boolean));
    if (ids.length === 0) {
      return new Map();
    }
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
      relations: { peers: true },
    });
    const messages = await this.messageRepo.find({
      where: { channelId, id: In(ids) },
      relations: { sender: true, allReactions: true },
      order: { sentAt: 'asc' },
    });
    const dtos = await this.enrichMessagesForPreview(
      messages,
      channel,
      senderId,
    );
    return mapBy(dtos, 'id');
  }

  /** Thread preview replies (already ordered per thread), with same presentation as {@link findReplies}. */
  async enrichRepliesForPreview(
    replies: MessageReply[],
    channel: Channel | null | undefined,
    senderId: number,
  ): Promise<void> {
    if (replies.length === 0) return;
    const mentionIds = uniq(
      replies.flatMap((r) =>
        r.contentRich
          ? extractMentionIdsFromDoc(r.contentRich)
          : extractMentionIds(r.content),
      ),
    );
    const peerUsersMap = await this.resolveMentionUsersMap(
      channel ?? undefined,
      mentionIds,
    );
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

    const replyIds = replies.map((r) => r.id);
    const attByReplyId =
      channel?.workspaceId != null
        ? await this.attachmentService.listAnchoredForReplies(
            channel.workspaceId,
            replyIds,
          )
        : new Map<number, CreatedAttachmentDto[]>();

    for (const reply of replies) {
      reply.setReactions(senderId);
      const mIds = reply.contentRich
        ? extractMentionIdsFromDoc(reply.contentRich)
        : extractMentionIds(reply.content);
      (reply as any).mentionedUsers = mIds
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
      (reply as any).attachments = attByReplyId.get(reply.id) ?? [];
    }
  }

  /**
   * Last K replies per parent for issue feed previews.
   */
  async findReplyPreviewsForMessageIds(
    messageIds: number[],
    previewLimit: number,
    senderId: number,
  ): Promise<{
    repliesByParentId: Map<number, MessageReply[]>;
    channel: Channel | null;
  }> {
    const parentIds = uniq(messageIds);
    if (!parentIds.length) {
      return { repliesByParentId: new Map(), channel: null };
    }

    const anyMsg = await this.messageRepo.findOne({
      where: { id: parentIds[0] },
      relations: { channel: { peers: true } },
    });

    const channel = anyMsg?.channel ?? null;

    const replies =
      previewLimit <= 0
        ? []
        : await this.replyRepo.findLatestRepliesForParents(
            parentIds,
            previewLimit,
          );

    await this.enrichRepliesForPreview(replies, channel, senderId);

    const repliesByParentId = groupBy(replies, 'messageId');
    return {
      repliesByParentId: new Map(
        parentIds.map((id) => [id, repliesByParentId[id] ?? []]),
      ),
      channel,
    };
  }

  @Transactional()
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
      ? (stripImageNodesFromDoc(normalizeTiptapDoc(contentRich)) as object)
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

    const mentionIds = normalizedRich
      ? extractMentionIdsFromDoc(normalizedRich)
      : extractMentionIds(plainContent);
    const peerUsersMap = await this.resolveMentionUsersMap(channel, mentionIds);
    const displayContent = renderMentions(plainContent, peerUsersMap);
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
      attachments: [],
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
      ? (stripImageNodesFromDoc(normalizeTiptapDoc(contentRich)) as object)
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

    const mentionIds = normalizedRich
      ? extractMentionIdsFromDoc(normalizedRich)
      : extractMentionIds(plainContent);
    const peerUsersMap = await this.resolveMentionUsersMap(channel, mentionIds);
    const displayContent = renderMentions(plainContent, peerUsersMap);
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

    const attachments = await this.attachmentService.listAnchoredForMessage(
      channel.workspaceId,
      messageId,
    );

    return new MessageDto({
      ...message,
      repliesCount,
      repliers,
      reactions,
      mentionedUsers,
      displayContent,
      attachments,
    });
  }

  async findReplies(messageId: number, senderId: number) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { channel: { peers: true } },
    });

    const replies = await this.replyRepo.find({
      where: { messageId },
      relations: { sender: true, allReactions: { user: true } },
      order: { sentAt: 'asc' },
    });

    await this.enrichRepliesForPreview(
      replies,
      message?.channel ?? null,
      senderId,
    );
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

  /**
   * Plain label for notifications — avoids empty names on DMs / unnamed channels
   * and never uses raw numeric channel ids in user-facing copy.
   */
  getChannelLabelForNotification(
    channel: Channel,
    recipientUserId?: number | null,
  ): string {
    const name = channel.name?.trim();
    if (name) return name;
    const peers = channel.peers ?? [];
    if (channel.type === 'direct' || channel.type === 'multi-direct') {
      const labels = peers
        .filter((p) => recipientUserId == null || p.id !== recipientUserId)
        .map((p) => p.name)
        .filter(Boolean);
      if (labels.length) return labels.join(', ');
      if (peers.length)
        return peers
          .map((p) => p.name)
          .filter(Boolean)
          .join(', ');
    }
    if (channel.type === 'meeting') return 'Meeting';
    if (channel.type === 'workspace_open') return 'Team';
    return 'Chat';
  }

  private plainTextBodyFromStoredContent(
    content: string,
    contentRich?: any | null,
  ): string {
    if (contentRich) {
      const normalized = normalizeTiptapDoc(contentRich);
      const stripped = stripImageNodesFromDoc(normalized) as object;
      return tiptapToPlainText(stripped, { stripFormatting: true });
    }
    return content ?? '';
  }

  private static truncateNotificationExcerpt(text: string, max = 220): string {
    const t = text.replace(/\s+/g, ' ').trim();
    if (!t) return '';
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
  }

  async buildMessageExcerptForNotification(
    message: Message,
    channel: Channel | null | undefined,
  ): Promise<string> {
    const plain = this.plainTextBodyFromStoredContent(
      message.content,
      message.contentRich,
    );
    const mentionIds = message.contentRich
      ? extractMentionIdsFromDoc(message.contentRich)
      : extractMentionIds(plain);
    const peerUsersMap = await this.resolveMentionUsersMap(
      channel ?? undefined,
      mentionIds,
    );
    const display = renderMentions(plain, peerUsersMap);
    return MessageService.truncateNotificationExcerpt(display);
  }

  async buildReplyExcerptForNotification(
    reply: MessageReply,
    channel: Channel | null | undefined,
  ): Promise<string> {
    const plain = this.plainTextBodyFromStoredContent(
      reply.content,
      reply.contentRich,
    );
    const mentionIds = reply.contentRich
      ? extractMentionIdsFromDoc(reply.contentRich)
      : extractMentionIds(plain);
    const peerUsersMap = await this.resolveMentionUsersMap(
      channel ?? undefined,
      mentionIds,
    );
    const display = renderMentions(plain, peerUsersMap);
    return MessageService.truncateNotificationExcerpt(display);
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
