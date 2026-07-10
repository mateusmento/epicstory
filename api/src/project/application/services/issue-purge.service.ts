import { Injectable } from '@nestjs/common';
import { CalendarEventRepository } from 'src/calendar/repositories';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { Issue } from 'src/project/domain/entities';
import {
  BacklogItemRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';

/**
 * Privileged issue teardown (no membership checks).
 * Used by RemoveIssue and workspace purge.
 */
@Injectable()
export class IssuePurgeService {
  constructor(
    private issueRepo: IssueRepository,
    private backlogItemRepo: BacklogItemRepository,
    private channelRepo: ChannelRepository,
    private attachments: AttachmentService,
    private scheduledJobs: ScheduledJobRepository,
    private calendarEventRepo: CalendarEventRepository,
  ) {}

  /** Leaves first, then parents — never includes `rootId`. */
  async collectDescendantsBottomUp(rootId: number): Promise<Issue[]> {
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

  async purgeIssue(issue: Issue): Promise<void> {
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

  /**
   * Purge every issue in a workspace, deepest descendants first so parent
   * pointers never cascade-delete children unexpectedly.
   */
  async purgeAllForWorkspace(workspaceId: number): Promise<void> {
    const issues = await this.issueRepo.find({ where: { workspaceId } });
    if (issues.length === 0) return;

    const byId = new Map(issues.map((i) => [i.id, i]));
    const childrenOf = new Map<number | null, number[]>();
    for (const issue of issues) {
      const parentKey = issue.parentIssueId ?? null;
      const list = childrenOf.get(parentKey) ?? [];
      list.push(issue.id);
      childrenOf.set(parentKey, list);
    }

    const ordered: Issue[] = [];
    const visit = (id: number) => {
      for (const childId of childrenOf.get(id) ?? []) {
        visit(childId);
      }
      const issue = byId.get(id);
      if (issue) ordered.push(issue);
    };
    for (const rootId of childrenOf.get(null) ?? []) {
      visit(rootId);
    }
    // Orphans with missing parents still in the set
    for (const issue of issues) {
      if (!ordered.includes(issue)) {
        visit(issue.id);
      }
    }

    for (const issue of ordered) {
      await this.purgeIssue(issue);
    }
  }
}
