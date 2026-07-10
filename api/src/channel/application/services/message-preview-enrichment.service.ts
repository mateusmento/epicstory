import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { IMessage, IssueReference } from '@epicstory/contracts';
import {
  enrichMentionLabels,
  extractIssueIds,
  extractMentionIds,
  tiptapDocToPlainDisplayText,
} from '@epicstory/tiptap';
import { uniq } from 'lodash';
import { UserRepository } from 'src/auth';
import { Channel, Message } from 'src/channel/domain';
import {
  buildQuotedMessagePreview,
  mapReactions,
  mapRepliers,
  toIssueReference,
} from 'src/channel/domain/utils';
import {
  ChannelRepository,
  MessageReplyRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { groupBy, mapBy } from 'src/core/objects';
import type { UploadedAttachment } from '@epicstory/contracts';
import { Issue } from 'src/project/domain/entities';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { In, Repository } from 'typeorm';
import { messageEntityToIMessageCore } from '../utils/message-entity-to-imessage';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { MessagePollService } from './message-poll.service';
import type { MessagePollSummary } from '@epicstory/contracts';

@Injectable()
export class MessagePreviewEnrichmentService {
  constructor(
    private messageRepo: MessageRepository,
    private replyRepo: MessageReplyRepository,
    private channelRepo: ChannelRepository,
    private userRepo: UserRepository,
    private attachmentService: AttachmentService,
    private readonly messagePolls: MessagePollService,
    private readonly workspaceRepo: WorkspaceRepository,
    @InjectRepository(Issue)
    private readonly issueRepo: Repository<Issue>,
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
   * Load and enrich selected parent messages scoped to `channelId` (same DTO shape as list).
   */
  async findMessagesByIdsForChannel(
    channelId: number,
    messageIds: number[],
    senderId: number,
  ): Promise<Map<number, IMessage>> {
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

  /**
   * Channel message list enrichment (quotes, reactions, replies meta, mentions, issues).
   */
  async enrichMessagesForPreview(
    messages: Message[],
    channel: Channel,
    senderId: number,
  ): Promise<IMessage[]> {
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
    const peerUsersMap = await this.workspaceRepo.findMembersMap(
      channel.workspaceId,
      allMentionIds,
    );

    const allIssueIds = uniq(
      messages.flatMap((message) => extractIssueIds(message.content)),
    );
    const referencedIssueRows =
      allIssueIds.length > 0
        ? await this.issueRepo.find({
            where: {
              id: In(allIssueIds),
              workspaceId: channel.workspaceId,
            },
          })
        : [];
    const issuesById = mapBy(referencedIssueRows, 'id');

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

    const quoteChannelIds = uniq(quotedRows.map((q) => q.channelId));
    const quoteIssues =
      quoteChannelIds.length > 0
        ? await this.issueRepo.find({
            where: {
              commentChannelId: In(quoteChannelIds),
              workspaceId: channel.workspaceId,
            },
          })
        : [];
    const issueByCommentChannelId = new Map(
      quoteIssues
        .filter((i) => i.commentChannelId != null)
        .map((i) => [i.commentChannelId!, i]),
    );

    const attachmentsByMessageId = channel
      ? await this.attachmentService.listAnchoredForMessages(
          channel.workspaceId,
          messageIds,
        )
      : new Map<number, UploadedAttachment[]>();

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

      const issueIds = extractIssueIds(message.content);
      const referencedIssues: IssueReference[] = issueIds
        .map((id) => issuesById.get(id))
        .filter((issue): issue is Issue => issue != null)
        .map(toIssueReference);

      const quotedSrc = message.quotedMessageId
        ? quotedById.get(message.quotedMessageId)
        : undefined;
      const quoteIssue = quotedSrc
        ? issueByCommentChannelId.get(quotedSrc.channelId)
        : undefined;

      const poll = message.poll
        ? this.messagePolls.mergePersistedPollWithSummary(
            message.poll,
            pollSummaries.get(message.id),
          )
        : undefined;

      return {
        ...messageEntityToIMessageCore(message),
        repliesCount: rc,
        repliers: reps,
        reactions,
        displayContent,
        mentionedUsers,
        referencedIssues,
        quotedMessage: buildQuotedMessagePreview(
          quotedSrc,
          peerUsersMap,
          quoteIssue ? toIssueReference(quoteIssue) : undefined,
        ),
        attachments: attachmentsByMessageId.get(message.id) ?? [],
        ...(poll ? { poll } : {}),
      } satisfies IMessage;
    });
  }
}
