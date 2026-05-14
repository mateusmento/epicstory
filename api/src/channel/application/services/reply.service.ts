import { BadRequestException, Injectable } from '@nestjs/common';
import { uniq } from 'lodash';
import { User, UserRepository } from 'src/auth';
import { Channel } from 'src/channel/domain';
import {
  MessageReply,
  MessageReplyReaction,
} from 'src/channel/domain/entities';
import { mapReactions, mapRepliers } from 'src/channel/domain/utils';
import {
  MessageReplyReactionRepository,
  MessageReplyRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { groupBy, mapBy } from 'src/core/objects';
import type { ICreatedAttachment } from 'src/workspace/application/services/attachment.service';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { In } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import type { JSONContent } from '@tiptap/core';
import { MessageNotFound } from '../exceptions';
import {
  enrichMentionLabels,
  extractMentionIds,
  normalizeTiptapDoc,
  tiptapDocToPlainDisplayText,
} from '@epicstory/tiptap';
import { ChannelMentionsService } from './channel-mentions.service';
import { truncateText } from 'src/utils';

export type QuotedReplyPreview = {
  id: number;
  sender: User;
  content: JSONContent;
  displayContent: string;
};

@Injectable()
export class ReplyService {
  constructor(
    private replyRepo: MessageReplyRepository,
    private messageRepo: MessageRepository,
    private messageReplyReactionRepo: MessageReplyReactionRepository,
    private userRepo: UserRepository,
    private attachmentService: AttachmentService,
    private channelMentions: ChannelMentionsService,
  ) {}

  /** Thread preview replies (already ordered per thread), with same presentation as {@link findReplies}. */
  async enrichRepliesForPreview(
    replies: MessageReply[],
    channel: Channel,
    senderId: number,
  ): Promise<void> {
    if (replies.length === 0) return;
    const mentionIds = uniq(
      replies.flatMap((r) => extractMentionIds(r.content)),
    );
    const mentionedUsersMap = await this.channelMentions.resolveMentionUsersMap(
      mentionIds,
      channel.workspaceId,
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
        : new Map<number, ICreatedAttachment[]>();

    for (const reply of replies) {
      reply.setReactions(senderId);
      const mIds = extractMentionIds(reply.content);
      (reply as any).mentionedUsers = mIds
        .map((id) => mentionedUsersMap.get(id))
        .filter(Boolean);
      (reply as any).displayContent = tiptapDocToPlainDisplayText(
        enrichMentionLabels(reply.content, mentionedUsersMap),
      );
      const qSrc = reply.quotedReplyId
        ? replyQuotedById.get(reply.quotedReplyId)
        : undefined;
      (reply as any).quotedMessage = this.buildQuotedPreviewFromReply(
        qSrc,
        mentionedUsersMap,
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

  buildQuotedPreviewFromReply(
    r: MessageReply | null | undefined,
    peerUsersMap: Map<number, User>,
  ): QuotedReplyPreview | undefined {
    if (!r?.sender) return undefined;
    return {
      id: r.id,
      sender: r.sender,
      content: r.content,
      displayContent: tiptapDocToPlainDisplayText(
        enrichMentionLabels(r.content, peerUsersMap),
      ),
    };
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

  async findReplyReactions(messageReplyId: number, senderId: number) {
    const reactions = await this.messageReplyReactionRepo.find({
      where: { messageReplyId },
      relations: { user: true },
    });

    return mapReactions(reactions, senderId);
  }

  async buildReplyExcerptForNotification(
    reply: MessageReply,
    channel: Channel,
  ): Promise<string> {
    const mentionIds = extractMentionIds(reply.content);
    const mentionedUsersMap = await this.channelMentions.resolveMentionUsersMap(
      mentionIds,
      channel.workspaceId,
    );
    const display = tiptapDocToPlainDisplayText(
      enrichMentionLabels(reply.content, mentionedUsersMap),
    );
    return truncateText(display);
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
