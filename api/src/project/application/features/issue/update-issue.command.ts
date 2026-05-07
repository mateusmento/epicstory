import {
  normalizeTiptapDoc,
  stripImageNodesFromDoc,
  tiptapToPlainText,
} from '@epicstory/tiptap';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { JSONContent } from '@tiptap/core';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
} from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import {
  IssueActivityRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';
import { ProjectGateway } from '../../gateways/project.gateway';
import { syncIssueDueDateReminders } from './sync-issue-due-reminders';

const DESCRIPTION_ACTIVITY_EXCERPT_MAX = 280;

function excerptFromDescription(
  doc: JSONContent | null | undefined,
  max = DESCRIPTION_ACTIVITY_EXCERPT_MAX,
): string | undefined {
  if (!doc) return undefined;
  const t = tiptapToPlainText(stripImageNodesFromDoc(normalizeTiptapDoc(doc)), {
    stripFormatting: true,
  })
    .trim()
    .replace(/\s+/g, ' ');
  if (!t) return undefined;
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

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

  constructor(data: Partial<UpdateIssue> = {}) {
    patch(this, data);
  }
}

@CommandHandler(UpdateIssue)
export class UpdateIssueCommand implements ICommandHandler<UpdateIssue> {
  constructor(
    private issueRepo: IssueRepository,
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
      (data as any).description = stripImageNodesFromDoc(
        normalizeTiptapDoc(data.description),
      );
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
      await this.issueActivities.save(
        this.issueActivities.create({
          issueId,
          actorId,
          type: 'description_changed',
          messageId: null,
          attachmentId: null,
          payload: {
            changeKind: excerptFromDescription(savedIssue.description)
              ? 'edited'
              : 'cleared',
            ...(excerptFromDescription(savedIssue.description)
              ? { excerpt: excerptFromDescription(savedIssue.description) }
              : {}),
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
      await this.issueActivities.save(
        this.issueActivities.create({
          issueId,
          actorId,
          type: 'parent_changed',
          messageId: null,
          attachmentId: null,
          payload: {
            previousParentIssueId: prevSnapshot.parentIssueId,
            newParentIssueId: savedIssue.parentIssueId ?? null,
          },
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
