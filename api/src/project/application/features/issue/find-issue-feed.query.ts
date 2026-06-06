import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { uniq } from 'lodash';
import { UserRepository } from 'src/auth';
import { In } from 'typeorm';
import {
  IMessagePayload,
  MessageService,
} from 'src/channel/application/services/message.service';
import { ReplyService } from 'src/channel/application/services/reply.service';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import {
  IssueActivityRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { parseStoredIssueActivityPayload } from 'src/project/domain/utils/issue-activity-payload-parse';
import {
  collectParentIssueIdsNeedingKeys,
  enrichParentChangedPayload,
} from 'src/project/domain/utils/parent-changed-activity-payload';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import type {
  IssueActivityPayload,
  IssueActivityType,
  ParentChangedPayload,
} from 'src/project/domain/types/issue-activity-payload.types';
import { IsOptional, Max, Min, IsNumber } from 'class-validator';
import { MessageReply } from 'src/channel/domain/entities';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
/** Last K replies per comment card preview (aligned with Section D.1 plan). */
const REPLY_PREVIEW_LIMIT = 3;

export type IIssueFeedActor = {
  id: number;
  name: string;
  picture: string | null;
};

export type IIssueFeedActivityItem = {
  activityId: number;
  issueId: number;
  type: IssueActivityType;
  actorId: number | null;
  /** Hydrated from `users` — not all actors are comment-channel peers. */
  actor: IIssueFeedActor | null;
  createdAt: Date;
  messageId: number | null;
  attachmentId: number | null;
  payload: IssueActivityPayload | null;
  /** Populated when `type === comment_created` — same shape as channel `IMessagePayload`. */
  message: unknown | null;
  replyPreviews: unknown[];
  repliesTotal?: number;
  /** True when more replies exist than `replyPreviews` (pagination / “show more”). */
  hasMoreOlder?: boolean;
};

export type IIssueFeedQueryResult = {
  commentChannelId: number | null;
  items: IIssueFeedActivityItem[];
};

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
  }: FindIssueFeed): Promise<IIssueFeedQueryResult> {
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
        : new Map<number, IMessagePayload>();

    const { repliesByParentId } =
      issue.commentChannelId != null && commentIds.length > 0
        ? await this.replies.findReplyPreviewsForMessageIds(
            commentIds,
            REPLY_PREVIEW_LIMIT,
            issuer.id,
          )
        : { repliesByParentId: new Map<number, MessageReply[]>() };

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
        ? ((parseStoredIssueActivityPayload(
            row.type,
            (row.payload as Record<string, unknown> | null) ?? null,
          ) ?? null) as ParentChangedPayload | null)
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

    const items: IIssueFeedActivityItem[] = rows.map((a) => {
      const dto = a.messageId ? messagesById.get(a.messageId) : undefined;
      const replyPreviews = a.messageId
        ? (repliesByParentId.get(a.messageId) ?? [])
        : [];
      const repliesTotal = dto?.repliesCount ?? 0;
      const hasMoreOlder =
        a.messageId != null ? repliesTotal > replyPreviews.length : undefined;

      const actorUser =
        a.actorId != null ? actorById.get(a.actorId) : undefined;

      let payload =
        parseStoredIssueActivityPayload(
          a.type,
          (a.payload as Record<string, unknown> | null) ?? null,
        ) ?? null;

      if (a.type === 'parent_changed' && payload != null) {
        payload = enrichParentChangedPayload(
          payload as ParentChangedPayload,
          parentKeysByIssueId,
        );
      }

      return {
        activityId: a.id,
        issueId: a.issueId,
        type: a.type,
        actorId: a.actorId,
        actor:
          actorUser != null
            ? {
                id: actorUser.id,
                name: actorUser.name,
                picture: actorUser.picture?.trim() ? actorUser.picture : null,
              }
            : null,
        createdAt: a.createdAt,
        messageId: a.messageId,
        attachmentId: a.attachmentId,
        payload,
        message: dto ?? null,
        replyPreviews: replyPreviews,
        repliesTotal: a.messageId != null ? repliesTotal : undefined,
        hasMoreOlder: a.messageId != null ? hasMoreOlder : undefined,
      };
    });

    return {
      commentChannelId: issue.commentChannelId ?? null,
      items,
    };
  }
}
