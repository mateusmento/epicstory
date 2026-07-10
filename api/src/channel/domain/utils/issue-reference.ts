import type { IssueReference } from '@epicstory/contracts';
import type { Issue } from 'src/project/domain/entities';

export function toIssueReference(issue: Issue): IssueReference {
  return {
    id: issue.id,
    issueKey: issue.issueKey,
    title: issue.title,
    status: issue.status,
    projectId: issue.projectId,
    workspaceId: issue.workspaceId,
  };
}
