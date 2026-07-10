import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { CalendarEventRepository } from 'src/calendar/repositories';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { Issue } from 'src/project/domain/entities';
import {
  BacklogItemRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

export class RemoveIssue {
  issueId: number;
  issuer: Issuer;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  deleteSubIssues?: boolean;

  constructor(data: Partial<RemoveIssue> = {}) {
    patch(this, data);
  }
}

@CommandHandler(RemoveIssue)
export class RemoveIssueCommand implements ICommandHandler<RemoveIssue> {
  constructor(
    private issueRepo: IssueRepository,
    private backlogItemRepo: BacklogItemRepository,
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    private attachments: AttachmentService,
    private scheduledJobs: ScheduledJobRepository,
    private calendarEventRepo: CalendarEventRepository,
  ) {}

  @Transactional()
  async execute({ issueId, issuer, deleteSubIssues }: RemoveIssue) {
    const root = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!root) throw new NotFoundException('Issue not found');
    if (!(await this.workspaceRepo.memberExists(root.workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    if (deleteSubIssues) {
      const descendants = await this.collectDescendantsBottomUp(root.id);
      for (const child of descendants) {
        await this.purgeIssue(child);
      }
    } else {
      await this.issueRepo.update(
        { parentIssueId: root.id },
        { parentIssueId: null },
      );
    }

    await this.purgeIssue(root);
  }

  /** Leaves first, then parents — never includes `rootId`. */
  private async collectDescendantsBottomUp(rootId: number): Promise<Issue[]> {
    const byParent = new Map<number, Issue[]>();
    const queue = [rootId];
    const seen = new Set<number>([rootId]);

    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = await this.issueRepo.find({
        where: { parentIssueId: parentId },
      });
      byParent.set(parentId, children);
      for (const child of children) {
        if (seen.has(child.id)) continue;
        seen.add(child.id);
        queue.push(child.id);
      }
    }

    const ordered: Issue[] = [];
    const visit = (id: number) => {
      for (const child of byParent.get(id) ?? []) {
        visit(child.id);
        ordered.push(child);
      }
    };
    visit(rootId);
    return ordered;
  }

  private async purgeIssue(issue: Issue): Promise<void> {
    await this.scheduledJobs.deleteUnprocessedDueIssueRemindersForIssue({
      workspaceId: issue.workspaceId,
      issueId: issue.id,
    });

    await this.attachments.deleteAllForIssue({
      workspaceId: issue.workspaceId,
      issueId: issue.id,
      commentChannelId: issue.commentChannelId ?? null,
    });

    if (issue.commentChannelId != null) {
      // Comment channels are system-owned (often no peers); delete row directly.
      await this.channelRepo.delete({ id: issue.commentChannelId });
    }

    if (issue.scheduledEventId) {
      const event = await this.calendarEventRepo.findOne({
        where: { id: issue.scheduledEventId as any },
      });
      if (event?.scheduledJobId) {
        await this.scheduledJobs.delete({ id: event.scheduledJobId });
      }
      await this.calendarEventRepo.delete({
        id: issue.scheduledEventId as any,
      });
    }

    await this.backlogItemRepo.delete({ issueId: issue.id });
    await this.issueRepo.delete({ id: issue.id });
  }
}
