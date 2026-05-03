import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsDate, IsNotEmpty, IsNumber, IsObject, IsOptional } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import {
  IssueActivityRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import { ScheduledJob } from 'src/scheduling/entities';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import { buildScheduledJobPayload } from 'src/scheduling/types/payload';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';
import { ProjectGateway } from '../../gateways/project.gateway';
import {
  isRichTextEqual,
  normalizeTiptapDoc,
  tiptapToPlainText,
  type RichTextDocument,
} from '@epicstory/tiptap';

const DESCRIPTION_ACTIVITY_EXCERPT_MAX = 280;

function excerptFromDescription(
  doc: RichTextDocument | null | undefined,
  max = DESCRIPTION_ACTIVITY_EXCERPT_MAX,
): string | undefined {
  if (doc == null) return undefined;
  const plain = tiptapToPlainText(normalizeTiptapDoc(doc) as object, {
    stripFormatting: true,
  });
  const t = plain.trim().replace(/\s+/g, ' ');
  if (!t) return undefined;
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export class UpdateIssue {
  issueId: number;
  issuer: Issuer;

  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsOptional()
  @IsObject()
  description?: RichTextDocument;

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

    const previousScheduledEventId = issue.scheduledEventId;

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
      // Determine who to notify - prioritize assignees, fallback to issuer
      const notifyUserId =
        issue.assignees && issue.assignees.length > 0
          ? issue.assignees[0].id // Notify first assignee (can be enhanced to notify all)
          : issuer.id;

      // Use updated title if provided, otherwise use current title
      const issueTitle = data.title ?? issue.title;

      if (dueDate === null) {
        // Due date is being removed - cancel the scheduled event if not processed
        if (previousScheduledEventId) {
          await this.scheduledJobRepo.deleteUnprocessedEvent(
            previousScheduledEventId,
          );
          issue.scheduledEventId = null;
        }
      } else {
        // Due date is being set or updated
        // Delete existing scheduled event if it exists and hasn't been processed
        if (previousScheduledEventId) {
          await this.scheduledJobRepo.deleteUnprocessedEvent(
            previousScheduledEventId,
          );
        }

        // Create a new scheduled job with the new due date
        const scheduledJob = ScheduledJob.create({
          type: ScheduledJobTypes.due_issue_reminder,
          workspaceId: issue.workspaceId,
          notifyMinutesBefore: 0,
          recurrence: { frequency: 'once' },
          payload: buildScheduledJobPayload(
            ScheduledJobTypes.due_issue_reminder,
            {
              userId: notifyUserId,
              title: issueTitle,
              description: `Issue "${issueTitle}" is due`,
              issueId: issue.id,
              projectId: issue.projectId,
            },
          ),
          dueAt: dueDate,
        });
        const savedJob = await this.scheduledJobRepo.save(scheduledJob);
        issue.scheduledEventId = savedJob.id as string;
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
      !isRichTextEqual(savedIssue.description, prevSnapshot.description)
    ) {
      const excerpt = excerptFromDescription(savedIssue.description);
      await this.issueActivities.save(
        this.issueActivities.create({
          issueId,
          actorId,
          type: 'description_changed',
          messageId: null,
          attachmentId: null,
          payload: {
            changeKind: excerpt ? 'edited' : 'cleared',
            ...(excerpt ? { excerpt } : {}),
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
