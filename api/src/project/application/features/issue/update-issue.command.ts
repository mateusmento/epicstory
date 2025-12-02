import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsDate, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssueRepository } from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { ScheduledEventRepository } from 'src/notifications/repositories/scheduled-event.repository';
import { ScheduledEvent } from 'src/notifications/entities/scheduled-event.entity';
import { Transactional } from 'typeorm-transactional';
import { ProjectGateway } from '../../gateways/project.gateway';

export class UpdateIssue {
  issueId: number;
  issuer: Issuer;

  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsNotEmpty()
  @IsOptional()
  status?: string;

  @IsDate()
  @IsOptional()
  dueDate: Date;

  @IsNumber()
  @IsOptional()
  priority?: number | null;

  constructor(data: Partial<UpdateIssue> = {}) {
    patch(this, data);
  }
}

@CommandHandler(UpdateIssue)
export class UpdateIssueCommand implements ICommandHandler<UpdateIssue> {
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
    private scheduledEventRepo: ScheduledEventRepository,
    private projectGateway: ProjectGateway,
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
          await this.scheduledEventRepo.deleteEventIfNotProcessed(
            previousScheduledEventId,
          );
          issue.scheduledEventId = null;
        }
      } else {
        // Due date is being set or updated
        // Delete existing scheduled event if it exists and hasn't been processed
        if (previousScheduledEventId) {
          await this.scheduledEventRepo.deleteEventIfNotProcessed(
            previousScheduledEventId,
          );
        }

        // Create a new scheduled event with the new due date
        const scheduledEvent = ScheduledEvent.create({
          userId: notifyUserId,
          payload: {
            type: 'issue_due_date',
            title: issueTitle,
            description: `Issue "${issueTitle}" is due`,
            issueId: issue.id,
          },
          dueAt: dueDate,
        });
        const savedEvent = await this.scheduledEventRepo.save(scheduledEvent);
        issue.scheduledEventId = savedEvent.id as string;
      }
    }

    patch(issue, data);
    const savedIssue = await this.issueRepo.save(issue);

    // Load the issue with all relations for WebSocket emission
    const loadedIssue = await this.issueRepo.findOne({
      where: { id: savedIssue.id },
      relations: ['assignees'],
    });

    // Emit WebSocket event to notify all clients in the project room
    this.projectGateway.emitIssueUpdated(issue.projectId, loadedIssue);

    return loadedIssue;
  }
}
