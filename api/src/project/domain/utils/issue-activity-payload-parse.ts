import type {
  IssueActivityPayload,
  IssueActivityType,
} from 'src/project/domain/types/issue-activity-payload.types';

/** Narrow jsonb payloads for feed / clients; rejects unknown shapes only when strictly needed (v1: trust DB). */
export function parseStoredIssueActivityPayload(
  type: IssueActivityType,
  raw: Record<string, unknown> | null,
): IssueActivityPayload | null {
  if (raw == null) {
    return null;
  }
  switch (type) {
    case 'issue_created':
    case 'comment_created':
      return Object.keys(raw).length ? (raw as IssueActivityPayload) : {};
    default:
      return raw as IssueActivityPayload;
  }
}
