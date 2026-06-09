import type { IReply } from '@epicstory/contracts';
import {
  enrichMentionLabels,
  extractMentionIds,
  normalizeTiptapDoc,
  tiptapDocToPlainDisplayText,
} from '@epicstory/tiptap';
import { Injectable } from '@nestjs/common';
import type { JSONContent } from '@tiptap/core';
import { uniq } from 'lodash';
import { User, UserRepository } from 'src/auth';
import { Channel, assertQuotedReplyInThread } from 'src/channel/domain';
import {
  Message,
  MessageReply,
  MessageReplyReaction,
} from 'src/channel/domain/entities';
import {
  buildQuotedReplyPreview,
  mapReactions,
  mapRepliers,
  type QuotedReplyPreview,
} from 'src/channel/domain/utils';
import {
  MessageReplyReactionRepository,
  MessageReplyRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { groupBy, mapBy } from 'src/core/objects';
import { Page } from 'src/core/page';
import { excerptFromTiptapDocWithWorkspaceMembers } from 'src/utils/tiptap-excerpt';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { In } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { MessageNotFound } from '../exceptions';
import { replyEntityToIReplyCore } from '../utils/reply-entity-to-ireply';
import { rethrowQuotedRuleAsBadRequest } from '../utils/rethrow-quoted-rule-as-bad-request';
import { ReplyPreviewEnrichmentService } from './reply-preview-enrichment.service';

export type { QuotedReplyPreview } from 'src/channel/domain/utils';

@Injectable()
export class ReplyService {
  constructor(
    private replyRepo: MessageReplyRepository,
    private messageRepo: MessageRepository,
    private messageReplyReactionRepo: MessageReplyReactionRepository,
    private userRepo: UserRepository,
    private attachmentService: AttachmentService,
    private workspaceRepo: WorkspaceRepository,
    private readonly replyPreview: ReplyPreviewEnrichmentService,
  ) {}

  enrichRepliesForPreview(
    replies: MessageReply[],
    channel: Channel,
    senderId: number,
  ) {
    return this.replyPreview.enrichRepliesForPreview(
      replies,
      channel,
      senderId,
    );
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
    try {
      assertQuotedReplyInThread(target, channelId, threadMessageId);
    } catch (e) {
      rethrowQuotedRuleAsBadRequest(e);
    }
    return quotedReplyId;
  }

  buildQuotedPreviewFromReply(
    r: MessageReply | null | undefined,
    peerUsersMap: Map<number, User>,
  ): QuotedReplyPreview | undefined {
    return buildQuotedReplyPreview(r, peerUsersMap);
  }

  @Transactional()
  async createReply(params: {
    messageId: number;
    senderId: number;
    content: JSONContent;
    quotedReplyId?: number | null;
  }): Promise<{ reply: IReply; parentMessage: Message }> {
    const parentMessage = await this.messageRepo.findOne({
      where: { id: params.messageId },
      relations: { channel: { peers: true } },
    });
    if (!parentMessage) throw new MessageNotFound();

    const normalizedContent = normalizeTiptapDoc(params.content);
    const resolvedQuote = await this.resolveQuotedReplyId(
      params.quotedReplyId,
      params.messageId,
      parentMessage.channelId,
    );

    const { id: replyId } = await this.replyRepo.save({
      content: normalizedContent,
      channelId: parentMessage.channelId,
      messageId: params.messageId,
      senderId: params.senderId,
      sentAt: new Date(),
      quotedReplyId: resolvedQuote,
    });

    const reply = await this.replyRepo.findOne({
      where: { id: replyId },
      relations: { sender: true, allReactions: { user: true } },
    });
    if (!reply) throw new MessageNotFound();

    const extractedMentionIds = extractMentionIds(normalizedContent);
    const peerUsersMap = await this.workspaceRepo.findMembersMap(
      parentMessage.channel.workspaceId,
      uniq(extractedMentionIds),
    );
    const mentionedUsers = extractedMentionIds
      .filter((id) => id !== params.senderId && peerUsersMap.has(id))
      .map((id) => peerUsersMap.get(id))
      .filter((user): user is User => user != null);
    const displayContent = tiptapDocToPlainDisplayText(
      enrichMentionLabels(normalizedContent, peerUsersMap),
    );

    let quotedMessage: QuotedReplyPreview | undefined;
    if (resolvedQuote) {
      const quoted = await this.replyRepo.findOne({
        where: { id: resolvedQuote },
        relations: { sender: true },
      });
      quotedMessage = this.buildQuotedPreviewFromReply(quoted, peerUsersMap);
    }

    const ireply = {
      ...replyEntityToIReplyCore(reply),
      displayContent,
      mentionedUsers,
      ...(quotedMessage ? { quotedMessage } : {}),
      repliesCount: 0,
      repliers: [],
      reactions: [],
      attachments: [],
    } satisfies IReply;

    return { reply: ireply, parentMessage };
  }

  async getReplySidebarForMessage(messageId: number): Promise<{
    repliesCount: number;
    repliers: ReturnType<typeof mapRepliers>;
    replierSenderIds: number[];
  }> {
    const repliesCountRows = await this.messageRepo.findRepliesCount([
      messageId,
    ]);
    const repliesCount = repliesCountRows[0]?.repliesCount ?? 0;
    const repliersRaw = await this.replyRepo.findRepliers([messageId]);
    const replierSenderIds = uniq(repliersRaw.map((r) => r.senderId));
    const users = await this.userRepo.find({
      where: { id: In(replierSenderIds) },
    });
    const usersMap = mapBy(users, 'id');
    const repliersMap = groupBy(repliersRaw, 'messageId');
    const repliers = mapRepliers(repliersMap[messageId] ?? [], usersMap);
    return { repliesCount, repliers, replierSenderIds };
  }

  @Transactional()
  async updateReplyBody(
    channel: Channel,
    replyId: number,
    content: JSONContent,
    viewerId: number,
    attachmentIds?: number[],
  ) {
    const normalizedContent = normalizeTiptapDoc(content);

    await this.replyRepo.update(
      { id: replyId },
      { content: normalizedContent },
    );

    await this.attachmentService.linkStagingToReply({
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      uploadedById: viewerId,
      messageReplyId: replyId,
      attachmentIds,
    });

    const reply = await this.replyRepo.findOne({
      where: { id: replyId },
      relations: { sender: true, allReactions: { user: true } },
    });
    if (!reply) throw new MessageNotFound();

    await this.enrichRepliesForPreview([reply], channel, viewerId);
    return reply;
  }

  async findAllRepliesForMessage(
    messageId: number,
    senderId: number,
  ): Promise<Page<MessageReply>> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { channel: { peers: true } },
    });

    if (!message) {
      throw new MessageNotFound();
    }

    const replies = await this.replyRepo.find({
      where: { messageId },
      relations: { sender: true, allReactions: { user: true } },
      order: { sentAt: 'ASC', id: 'ASC' },
    });

    await this.enrichRepliesForPreview(
      replies,
      message.channel ?? null,
      senderId,
    );

    const n = replies.length;

    return new Page({
      content: replies,
      page: 0,
      count: n,
      hasNext: false,
      hasPrevious: false,
      total: n,
    });
  }

  async findReplies(
    messageId: number,
    senderId: number,
    options: {
      limit: number;
      beforeSentAt?: Date;
      beforeId?: number;
    },
  ): Promise<Page<MessageReply>> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { channel: { peers: true } },
    });

    if (!message) {
      throw new MessageNotFound();
    }

    const take = Math.min(Math.max(1, options.limit), 100) + 1;

    const qb = this.replyRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.sender', 'sender')
      .leftJoinAndSelect('r.allReactions', 'allReactions')
      .leftJoinAndSelect('allReactions.user', 'user')
      .where('r.messageId = :messageId', { messageId })
      .orderBy('r.sentAt', 'DESC')
      .addOrderBy('r.id', 'DESC')
      .take(take);

    if (options.beforeSentAt != null && options.beforeId != null) {
      qb.andWhere('(r.sentAt < :bs OR (r.sentAt = :bs AND r.id < :bid))', {
        bs: options.beforeSentAt,
        bid: options.beforeId,
      });
    }

    const rawDesc = await qb.getMany();
    const hasMoreOlder = rawDesc.length >= take;
    const pageRows = (hasMoreOlder ? rawDesc.slice(0, take - 1) : rawDesc)
      .slice()
      .reverse();

    await this.enrichRepliesForPreview(
      pageRows,
      message.channel ?? null,
      senderId,
    );

    const hasCursor = options.beforeSentAt != null && options.beforeId != null;

    return new Page({
      content: pageRows,
      page: 0,
      count: Math.min(Math.max(1, options.limit), 100),
      hasNext: hasMoreOlder,
      hasPrevious: hasCursor,
      total: 0,
    });
  }

  async findReplyReactions(messageReplyId: number, senderId: number) {
    const reactions = await this.messageReplyReactionRepo.find({
      where: { messageReplyId },
      relations: { user: true },
    });

    return mapReactions(reactions, senderId);
  }

  buildReplyExcerptForNotification(
    reply: MessageReply,
    channel: Channel,
  ): Promise<string> {
    return excerptFromTiptapDocWithWorkspaceMembers(
      this.workspaceRepo,
      channel.workspaceId,
      reply.content,
    );
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
