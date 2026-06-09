import type {
  IIssueFeed,
  IIssueFeedItem,
  IMessage,
  IReply,
  IssueActivityPayload,
  IUser,
  ParentChangedPayload,
} from '@epicstory/contracts';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { uniq } from 'lodash';
import { UserRepository, userToIUser } from 'src/auth';
import { MessageService } from 'src/channel/application/services/message.service';
import { ReplyService } from 'src/channel/application/services/reply.service';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import {
  collectParentIssueIdsNeedingKeys,
  enrichParentChangedPayload,
} from 'src/project/domain/utils/parent-changed-activity-payload';
import {
  IssueActivityRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { In } from 'typeorm';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
/** Last K replies per comment card preview (aligned with Section D.1 plan). */
const REPLY_PREVIEW_LIMIT = 3;

export class FindIssueFeed {
  issuer: Issuer;
  issueId: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number;

  constructor(data: Partial<FindIssueFeed> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindIssueFeed)
export class FindIssueFeedQuery implements IQueryHandler<FindIssueFeed> {
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
    private activities: IssueActivityRepository,
    private messages: MessageService,
    private replies: ReplyService,
    private userRepo: UserRepository,
  ) {}

  async execute({
    issueId,
    issuer,
    limit,
  }: FindIssueFeed): Promise<IIssueFeed> {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (
      !(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id))
    ) {
      throw new IssuerUserIsNotWorkspaceMember();
    }

    const take = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const rows = await this.activities.find({
      where: { issueId },
      order: { createdAt: 'ASC' },
      take,
    });

    const commentIds = uniq(
      rows
        .filter((r) => r.type === 'comment_created' && r.messageId != null)
        .map((r) => r.messageId!),
    );

    const messagesById =
      issue.commentChannelId != null && commentIds.length > 0
        ? await this.messages.findMessagesByIdsForChannel(
            issue.commentChannelId,
            commentIds,
            issuer.id,
          )
        : new Map<number, IMessage>();

    const { repliesByParentId } =
      issue.commentChannelId != null && commentIds.length > 0
        ? await this.replies.findReplyPreviewsForMessageIds(
            commentIds,
            REPLY_PREVIEW_LIMIT,
            issuer.id,
          )
        : { repliesByParentId: new Map<number, IReply[]>() };

    const actorIds = uniq(
      rows.map((r) => r.actorId).filter((id): id is number => id != null),
    );
    const actorRows =
      actorIds.length > 0
        ? await this.userRepo.find({ where: { id: In(actorIds) } })
        : [];
    const actorById = new Map(actorRows.map((u) => [u.id, u]));

    const parsedPayloads = rows.map((row) =>
      row.type === 'parent_changed'
        ? ((row.payload as ParentChangedPayload | null) ?? null)
        : null,
    );
    const parentIdsNeedingKeys =
      collectParentIssueIdsNeedingKeys(parsedPayloads);
    const parentKeyRows =
      parentIdsNeedingKeys.length > 0
        ? await this.issueRepo.find({
            where: { id: In(parentIdsNeedingKeys) },
            select: { id: true, issueKey: true },
          })
        : [];
    const parentKeysByIssueId = new Map(
      parentKeyRows.map((row) => [row.id, row.issueKey]),
    );

    const items: IIssueFeedItem[] = rows.map((a) => {
      const dto = a.messageId ? messagesById.get(a.messageId) : undefined;
      const replyPreviews = a.messageId
        ? (repliesByParentId.get(a.messageId) ?? [])
        : [];
      const repliesTotal = dto?.repliesCount ?? 0;
      const hasMoreOlder =
        a.messageId != null ? repliesTotal > replyPreviews.length : undefined;

      const actorUser =
        a.actorId != null ? actorById.get(a.actorId) : undefined;

      const payload: IssueActivityPayload | null =
        a.type === 'parent_changed' && a.payload != null
          ? enrichParentChangedPayload(a.payload, parentKeysByIssueId)
          : (a.payload ?? null);

      const actor: IUser | null =
        actorUser != null ? userToIUser(actorUser) : null;

      return {
        activityId: a.id,
        issueId: a.issueId,
        type: a.type,
        actorId: a.actorId,
        actor,
        createdAt: a.createdAt.toISOString(),
        messageId: a.messageId,
        attachmentId: a.attachmentId,
        payload,
        message: dto ?? null,
        replyPreviews,
        repliesTotal: a.messageId != null ? repliesTotal : undefined,
        hasMoreOlder: a.messageId != null ? hasMoreOlder : undefined,
      } as IIssueFeedItem;
    });

    return {
      commentChannelId: issue.commentChannelId ?? null,
      items,
    } satisfies IIssueFeed;
  }
}
