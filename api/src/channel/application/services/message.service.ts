import type { IMessage } from '@epicstory/contracts';
import {
  enrichMentionLabels,
  extractMentionIds,
  normalizeTiptapDoc,
  tiptapDocToPlainDisplayText,
} from '@epicstory/tiptap';
import { Injectable } from '@nestjs/common';
import type { JSONContent } from '@tiptap/core';
import { uniq } from 'lodash';
import { UserRepository } from 'src/auth';
import {
  Channel,
  Message,
  MessageReaction,
  assertQuotedParentMessageInChannel,
} from 'src/channel/domain';
import {
  buildQuotedMessagePreview,
  mapReactions,
} from 'src/channel/domain/utils';
import type { QuotedMessagePreview } from 'src/channel/domain/utils/message-quote-display';
import {
  ChannelRepository,
  MessageReactionRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { create, mapBy } from 'src/core/objects';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { In } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import type { MessagePollBody } from '../dtos/message-poll.dto';
import { MessageNotFound } from '../exceptions';
import { messageEntityToIMessageCore } from '../utils/message-entity-to-imessage';
import { rethrowQuotedRuleAsBadRequest } from '../utils/rethrow-quoted-rule-as-bad-request';
import { MessagePollService } from './message-poll.service';
import { MessagePreviewEnrichmentService } from './message-preview-enrichment.service';
import { ReplyService } from './reply.service';

export type { IMessage } from '@epicstory/contracts';
export type { IMessage as IMessagePayload } from '@epicstory/contracts';
export type { QuotedMessagePreview } from 'src/channel/domain/utils/message-quote-display';

@Injectable()
export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private messageReactionRepo: MessageReactionRepository,
    private channelRepo: ChannelRepository,
    private userRepo: UserRepository,
    private attachmentService: AttachmentService,
    private readonly messagePolls: MessagePollService,
    private readonly replyService: ReplyService,
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly messagePreview: MessagePreviewEnrichmentService,
  ) {}

  findMessages(channelId: number, senderId: number) {
    return this.messagePreview.findMessages(channelId, senderId);
  }

  findMessagesByIdsForChannel(
    channelId: number,
    messageIds: number[],
    senderId: number,
  ) {
    return this.messagePreview.findMessagesByIdsForChannel(
      channelId,
      messageIds,
      senderId,
    );
  }

  @Transactional()
  async createMessage(
    channel: Channel,
    senderId: number,
    content: JSONContent,
    quotedMessageId?: number | null,
    options?: { isScheduled?: boolean; poll?: MessagePollBody | null },
  ) {
    const channelId = channel.id;

    const resolvedQuote = await this.resolveQuotedMessageId(
      quotedMessageId,
      channelId,
    );

    const normalizedContent = normalizeTiptapDoc(content);

    const normalizedPoll =
      options?.poll != null
        ? this.messagePolls.normalizePollBody(options.poll)
        : null;

    let message = await this.messageRepo.save(
      create(Message, {
        channelId,
        senderId,
        content: normalizedContent,
        poll: normalizedPoll,
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

    const mentionIds = extractMentionIds(normalizedContent);
    const peerUsersMap = await this.workspaceRepo.findMembersMap(
      channel.workspaceId,
      mentionIds,
    );
    let displayContent = tiptapDocToPlainDisplayText(
      enrichMentionLabels(normalizedContent, peerUsersMap),
    );
    if (normalizedPoll) {
      displayContent = [
        displayContent,
        this.messagePolls.pollPlainSnippet(normalizedPoll),
      ]
        .filter((s) => s.trim().length > 0)
        .join('\n')
        .trim();
    }
    const mentionedUsers = mentionIds
      .map((id) => peerUsersMap.get(id))
      .filter((user) => user);

    let quotedPreview: QuotedMessagePreview | undefined;
    if (resolvedQuote) {
      const q = await this.messageRepo.findOne({
        where: { id: resolvedQuote },
        relations: { sender: true },
      });
      quotedPreview = buildQuotedMessagePreview(q, peerUsersMap);
    }

    const pollDto =
      message!.poll != null
        ? await this.messagePolls.mergePollForClient(
            message!.id,
            message!.poll,
            senderId,
          )
        : undefined;

    return {
      ...messageEntityToIMessageCore(message!),
      mentionedUsers,
      displayContent,
      quotedMessage: quotedPreview,
      attachments: [],
      repliesCount: 0,
      repliers: [],
      reactions: [],
      ...(pollDto ? { poll: pollDto } : {}),
    } satisfies IMessage;
  }

  /**
   * Validates that a quoted message exists and belongs to the same channel.
   * Used by {@link createMessage}.
   */
  async resolveQuotedMessageId(
    quotedMessageId: number | null | undefined,
    channelId: number,
  ): Promise<number | null> {
    if (quotedMessageId == null) return null;
    const target = await this.messageRepo.findOne({
      where: { id: quotedMessageId },
    });
    try {
      assertQuotedParentMessageInChannel(target, channelId);
    } catch (e) {
      rethrowQuotedRuleAsBadRequest(e);
    }
    return quotedMessageId;
  }

  async updateMessageBody(
    channel: Channel,
    messageId: number,
    content: JSONContent,
    viewerId: number,
    attachmentIds?: number[],
    poll?: MessagePollBody | null,
  ) {
    const existing = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { sender: true, allReactions: { user: true } },
    });
    if (!existing) throw new MessageNotFound();

    const normalizedContent = normalizeTiptapDoc(content);

    existing.content = normalizedContent;
    existing.editedAt = new Date();

    if (poll !== undefined) {
      if (poll === null) {
        if (existing.poll != null) {
          await this.messagePolls.deleteVotesForMessage(messageId);
        }
        existing.poll = null;
      } else {
        const normalizedPoll = this.messagePolls.normalizePollBody(poll);
        if (
          this.messagePolls.messagePollFingerprint(existing.poll) !==
          this.messagePolls.messagePollFingerprint(normalizedPoll)
        ) {
          await this.messagePolls.deleteVotesForMessage(messageId);
        }
        existing.poll = normalizedPoll;
      }
    }

    await this.messageRepo.save(existing);

    await this.attachmentService.linkStagingToMessage({
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      uploadedById: viewerId,
      messageId,
      attachmentIds,
    });

    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { sender: true, allReactions: { user: true } },
    });
    if (!message) throw new MessageNotFound();

    const mentionIds = extractMentionIds(normalizedContent);
    const peerUsersMap = await this.workspaceRepo.findMembersMap(
      channel.workspaceId,
      mentionIds,
    );
    const displayBase = tiptapDocToPlainDisplayText(
      enrichMentionLabels(normalizedContent, peerUsersMap),
    );
    const displayContent = message.poll
      ? [displayBase, this.messagePolls.pollPlainSnippet(message.poll)]
          .filter((s) => s.trim().length > 0)
          .join('\n')
          .trim()
      : displayBase;
    const mentionedUsers = mentionIds
      .map((id) => peerUsersMap.get(id))
      .filter((user) => user);

    const { repliesCount, repliers, replierSenderIds } =
      await this.replyService.getReplySidebarForMessage(messageId);

    const usersIds = uniq([
      ...replierSenderIds,
      ...message.allReactions.map((r) => r.userId),
    ]);
    const users = await this.userRepo.find({
      where: { id: In(usersIds) },
    });
    const usersMap = mapBy(users, 'id');
    const reactions = mapReactions(message.allReactions, viewerId, usersMap);

    const attachments = await this.attachmentService.listAnchoredForMessage(
      channel.workspaceId,
      messageId,
    );

    const pollDto =
      message.poll != null
        ? await this.messagePolls.mergePollForClient(
            message.id,
            message.poll,
            viewerId,
          )
        : undefined;

    return {
      ...messageEntityToIMessageCore(message),
      repliesCount,
      repliers,
      reactions,
      mentionedUsers,
      displayContent,
      attachments,
      ...(pollDto ? { poll: pollDto } : {}),
    } satisfies IMessage;
  }

  async findMessageReactions(messageId: number, senderId: number) {
    const reactions = await this.messageReactionRepo.find({
      where: { messageId },
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
}
