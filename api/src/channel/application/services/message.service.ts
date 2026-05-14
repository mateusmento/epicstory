import { BadRequestException, Injectable } from '@nestjs/common';
import { uniq } from 'lodash';
import { User, UserRepository } from 'src/auth';
import { Channel, Message, MessageReaction } from 'src/channel/domain';
import { mapReactions, mapRepliers } from 'src/channel/domain/utils';
import {
  ChannelRepository,
  MessageReactionRepository,
  MessageReplyRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { create, groupBy, mapBy, patch } from 'src/core/objects';
import type { ICreatedAttachment } from 'src/workspace/application/services/attachment.service';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { In } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import type { JSONContent } from '@tiptap/core';
import { MessageNotFound } from '../exceptions';
import type { MessagePollBody } from '../dtos/message-poll.dto';
import type {
  IMessagePollClient,
  MessagePollSummary,
} from './message-poll.service';
import { ChannelMentionsService } from './channel-mentions.service';
import { MessagePollService } from './message-poll.service';
import { ReplyService } from './reply.service';
import {
  enrichMentionLabels,
  extractMentionIds,
  normalizeTiptapDoc,
  tiptapDocToPlainDisplayText,
} from '@epicstory/tiptap';

export type {
  IMessagePollClient,
  MessagePollSummary,
} from './message-poll.service';

export type MessageReactionsGroup = {
  emoji: string;
  reactedBy: User[];
  firstReactedAt?: Date;
  reactedByMe: boolean;
};

export type QuotedMessagePreview = {
  id: number;
  sender: User;
  content: JSONContent;
  displayContent: string;
};

export class IMessagePayload extends Message {
  mentionedUsers?: User[];
  displayContent?: string;
  /** Hydrated preview of `quotedMessageId` for clients. */
  quotedMessage?: QuotedMessagePreview;

  /** Linked files (not embedded in message JSON; shown below the body in the client). */
  attachments?: ICreatedAttachment[];

  poll?: IMessagePollClient;

  repliesCount: number;
  repliers: { user: User; repliesCount: number }[];
  reactions: MessageReactionsGroup[];

  constructor(data: Partial<IMessagePayload>) {
    super();
    this.reactions = [];
    this.repliesCount = 0;
    this.repliers = [];
    patch(this, data);
  }
}

/** Avoid spreading entity `poll` (persisted shape) into {@link IMessagePayload} (`poll` is client summary). */
function messageEntityWithoutPoll(message: Message): Omit<Message, 'poll'> {
  const rest = { ...message };
  delete rest.poll;
  return rest as Omit<Message, 'poll'>;
}

@Injectable()
export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private replyRepo: MessageReplyRepository,
    private messageReactionRepo: MessageReactionRepository,
    private channelRepo: ChannelRepository,
    private userRepo: UserRepository,
    private attachmentService: AttachmentService,
    private readonly messagePolls: MessagePollService,
    private readonly replyService: ReplyService,
    private readonly channelMentions: ChannelMentionsService,
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

    return this.enrichMessagesForPreview(messages, channel, senderId);
  }

  /**
   * Channel message list enrichment (quotes, reactions, replies meta, mentions).
   */
  private async enrichMessagesForPreview(
    messages: Message[],
    channel: Channel | null | undefined,
    senderId: number,
  ): Promise<IMessagePayload[]> {
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
      messages.flatMap((message) => extractMentionIds(message.content)),
    );
    const peerUsersMap = await this.channelMentions.resolveMentionUsersMap(
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
      : new Map<number, ICreatedAttachment[]>();

    const pollMessageIds = messages
      .filter((m) => m.poll != null)
      .map((m) => m.id);
    const pollSummaries =
      pollMessageIds.length > 0
        ? await this.messagePolls.findPollSummariesForMessages(
            pollMessageIds,
            senderId,
          )
        : new Map<number, MessagePollSummary>();

    return messages.map((message) => {
      const rc = repliesCountMap.get(message.id)?.repliesCount ?? 0;
      const reps = mapRepliers(repliersMap[message.id] ?? [], usersMap);
      const reactions = mapReactions(message.allReactions, senderId, usersMap);
      const displayBase = tiptapDocToPlainDisplayText(
        enrichMentionLabels(message.content, peerUsersMap),
      );
      const displayContent = message.poll
        ? [displayBase, this.messagePolls.pollPlainSnippet(message.poll)]
            .filter((s) => s.trim().length > 0)
            .join('\n')
            .trim()
        : displayBase;
      const mentionIds = extractMentionIds(message.content);
      const mentionedUsers = mentionIds
        .map((id) => peerUsersMap.get(id))
        .filter((user) => user);

      const quotedSrc = message.quotedMessageId
        ? quotedById.get(message.quotedMessageId)
        : undefined;

      const poll = message.poll
        ? this.messagePolls.mergePersistedPollWithSummary(
            message.poll,
            pollSummaries.get(message.id),
          )
        : undefined;

      return new IMessagePayload({
        ...messageEntityWithoutPoll(message),
        repliesCount: rc,
        repliers: reps,
        reactions,
        displayContent,
        mentionedUsers,
        quotedMessage: this.buildQuotedPreview(quotedSrc, peerUsersMap),
        attachments: attachmentsByMessageId.get(message.id) ?? [],
        ...(poll ? { poll } : {}),
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
  ): Promise<Map<number, IMessagePayload>> {
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
    const peerUsersMap = await this.channelMentions.resolveMentionUsersMap(
      channel,
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
      quotedPreview = this.buildQuotedPreview(q, peerUsersMap);
    }

    const pollDto =
      message!.poll != null
        ? await this.messagePolls.mergePollForClient(
            message!.id,
            message!.poll,
            senderId,
          )
        : undefined;

    return new IMessagePayload({
      ...messageEntityWithoutPoll(message!),
      mentionedUsers,
      displayContent,
      quotedMessage: quotedPreview,
      attachments: [],
      ...(pollDto ? { poll: pollDto } : {}),
    });
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

  buildQuotedPreview(
    m: Message | null | undefined,
    peerUsersMap: Map<number, User>,
  ): QuotedMessagePreview | undefined {
    if (!m?.sender) return undefined;
    return {
      id: m.id,
      sender: m.sender,
      content: m.content,
      displayContent: tiptapDocToPlainDisplayText(
        enrichMentionLabels(m.content, peerUsersMap),
      ),
    };
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
    const peerUsersMap = await this.channelMentions.resolveMentionUsersMap(
      channel,
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

    return new IMessagePayload({
      ...messageEntityWithoutPoll(message),
      repliesCount,
      repliers,
      reactions,
      mentionedUsers,
      displayContent,
      attachments,
      ...(pollDto ? { poll: pollDto } : {}),
    });
  }

  async findMessageReactions(messageId: number, senderId: number) {
    const reactions = await this.messageReactionRepo.find({
      where: { messageId },
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
    const mentionIds = extractMentionIds(message.content);
    const peerUsersMap = await this.channelMentions.resolveMentionUsersMap(
      channel ?? undefined,
      mentionIds,
    );
    const display = tiptapDocToPlainDisplayText(
      enrichMentionLabels(message.content, peerUsersMap),
    );
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
}
