import { normalizeTiptapDoc } from '@epicstory/tiptap';
import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { JSONContent } from '@tiptap/core';
import {
  IsDate,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
} from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import {
  IssueActivityRepository,
  IssueDependencyRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import {
  excerptFromTiptapDocOptional,
  TIPTAP_ISSUE_DESCRIPTION_ACTIVITY_EXCERPT_MAX,
} from 'src/utils/tiptap-excerpt';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { buildParentChangedPayload } from 'src/project/domain/utils/parent-changed-activity-payload';
import { Transactional } from 'typeorm-transactional';
import { In } from 'typeorm';
import { ProjectGateway } from '../../gateways/project.gateway';
import { syncIssueDueDateReminders } from './sync-issue-due-reminders';

export class UpdateIssue {
  issueId: number;
  issuer: Issuer;

  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsNotEmpty()
  @IsOptional()
  @IsObject()
  description?: JSONContent;

  @IsNotEmpty()
  @IsOptional()
  status?: string;

  @IsDate()
  @IsOptional()
  dueDate: Date;

  @IsNumber()
  @IsOptional()
  priority?: number | null;

  @IsNumber()
  @IsOptional()
  parentIssueId?: number | null;

  @IsOptional()
  @IsIn(['task', 'epic'])
  issueType?: 'task' | 'epic';

  constructor(data: Partial<UpdateIssue> = {}) {
    patch(this, data);
  }
}

@CommandHandler(UpdateIssue)
export class UpdateIssueCommand implements ICommandHandler<UpdateIssue> {
  constructor(
    private issueRepo: IssueRepository,
    private issueDependencyRepo: IssueDependencyRepository,
    private workspaceRepo: WorkspaceRepository,
    private scheduledJobRepo: ScheduledJobRepository,
    private projectGateway: ProjectGateway,
    private issueActivities: IssueActivityRepository,
  ) {}

  @Transactional()
  async execute({ issueId, issuer, ...data }: UpdateIssue) {
    const issue = await this.issueRepo.findOne({
      where: { id: issueId },
      relations: ['assignees'],
    });
    if (!(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    const prevSnapshot = {
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      dueDate: issue.dueDate,
      parentIssueId: issue.parentIssueId ?? null,
    };

    const { dueDate } = data;

    // Handle scheduled event management
    if (dueDate !== undefined) {
      // Persist the dueDate change before syncing jobs so the sync sees the new value.
      issue.dueDate = dueDate as any;

      // We now schedule one job per assignee (payload.userId); keep the legacy field cleared.
      issue.scheduledEventId = null;

      await syncIssueDueDateReminders({
        scheduledJobRepo: this.scheduledJobRepo,
        issue,
        issuerId: issuer.id,
        titleOverride: data.title ?? issue.title,
      });
    }

    if (data.description !== undefined) {
      (data as any).description = normalizeTiptapDoc(data.description);
    }

    if (data.issueType !== undefined && data.issueType !== issue.issueType) {
      if (data.issueType === 'task' && issue.issueType === 'epic') {
        if (issue.startsAt != null || issue.endsAt != null) {
          throw new BadRequestException(
            'Clear schedule dates before changing epic to task',
          );
        }
        const depCount = await this.issueDependencyRepo.count({
          where: [{ issueId }, { dependsOnIssueId: issueId }],
        });
        if (depCount > 0) {
          throw new BadRequestException(
            'Remove dependencies before changing epic to task',
          );
        }
      }
    }

    patch(issue, data);
    const savedIssue = await this.issueRepo.save(issue);

    const actorId = issuer.id;
    if (data.title !== undefined && savedIssue.title !== prevSnapshot.title) {
      await this.issueActivities.save(
        this.issueActivities.create({
          issueId,
          actorId,
          type: 'title_changed',
          messageId: null,
          attachmentId: null,
          payload: {
            previousTitle: prevSnapshot.title,
            newTitle: savedIssue.title,
          },
        }),
      );
    }
    if (
      data.description !== undefined &&
      savedIssue.description !== prevSnapshot.description
    ) {
      const descriptionExcerpt = excerptFromTiptapDocOptional(
        savedIssue.description,
        { max: TIPTAP_ISSUE_DESCRIPTION_ACTIVITY_EXCERPT_MAX },
      );
      await this.issueActivities.save(
        this.issueActivities.create({
          issueId,
          actorId,
          type: 'description_changed',
          messageId: null,
          attachmentId: null,
          payload: {
            changeKind: descriptionExcerpt ? 'edited' : 'cleared',
            ...(descriptionExcerpt ? { excerpt: descriptionExcerpt } : {}),
          },
        }),
      );
    }
    if (
      data.status !== undefined &&
      savedIssue.status !== prevSnapshot.status
    ) {
      await this.issueActivities.save(
        this.issueActivities.create({
          issueId,
          actorId,
          type: 'status_changed',
          messageId: null,
          attachmentId: null,
          payload: {
            previousStatus: prevSnapshot.status,
            newStatus: savedIssue.status,
          },
        }),
      );
    }
    if (
      data.priority !== undefined &&
      savedIssue.priority !== prevSnapshot.priority
    ) {
      await this.issueActivities.save(
        this.issueActivities.create({
          issueId,
          actorId,
          type: 'priority_changed',
          messageId: null,
          attachmentId: null,
          payload: {
            previousPriority: prevSnapshot.priority,
            newPriority: savedIssue.priority,
          },
        }),
      );
    }
    if (data.dueDate !== undefined) {
      const pt = prevSnapshot.dueDate?.getTime() ?? null;
      const nt = savedIssue.dueDate?.getTime() ?? null;
      if (pt !== nt) {
        await this.issueActivities.save(
          this.issueActivities.create({
            issueId,
            actorId,
            type: 'due_date_changed',
            messageId: null,
            attachmentId: null,
            payload: {
              previousDueDate:
                prevSnapshot.dueDate != null
                  ? prevSnapshot.dueDate.toISOString()
                  : null,
              newDueDate:
                savedIssue.dueDate != null
                  ? savedIssue.dueDate.toISOString()
                  : null,
            },
          }),
        );
      }
    }
    if (
      data.parentIssueId !== undefined &&
      (savedIssue.parentIssueId ?? null) !== prevSnapshot.parentIssueId
    ) {
      const previousParentIssueId = prevSnapshot.parentIssueId;
      const newParentIssueId = savedIssue.parentIssueId ?? null;
      const parentIds = [
        ...new Set(
          [previousParentIssueId, newParentIssueId].filter(
            (id): id is number => id != null,
          ),
        ),
      ];
      const parentRows =
        parentIds.length > 0
          ? await this.issueRepo.find({
              where: { id: In(parentIds) },
              select: { id: true, issueKey: true },
            })
          : [];
      const keysByIssueId = new Map(
        parentRows.map((row) => [row.id, row.issueKey]),
      );

      await this.issueActivities.save(
        this.issueActivities.create({
          issueId,
          actorId,
          type: 'parent_changed',
          messageId: null,
          attachmentId: null,
          payload: buildParentChangedPayload({
            previousParentIssueId,
            newParentIssueId,
            keysByIssueId,
          }),
        }),
      );
    }

    // Load the issue with all relations for WebSocket emission
    const loadedIssue = await this.issueRepo.findOne({
      where: { id: savedIssue.id },
      relations: {
        assignees: true,
        labels: true,
        parentIssue: true,
        subIssues: true,
      },
    });

    // Emit WebSocket event to notify all clients in the project room
    this.projectGateway.emitIssueUpdated(issue.projectId, loadedIssue);

    return loadedIssue;
  }
}
