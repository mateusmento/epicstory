/** Match Epicstory issue routes: `/{workspaceId}/project/{projectId}/issue/{issueId}`. */
const ISSUE_PATH_RE = /(?:^|\/)(\d+)\/project\/(\d+)\/issue\/(\d+)(?:\?|#|$)/;

export type ParsedEpicstoryIssueUrl = {
  workspaceId: number;
  projectId: number;
  issueId: number;
};

export function parseEpicstoryIssueUrl(text: string): ParsedEpicstoryIssueUrl | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  let path = trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      path = new URL(trimmed).pathname;
    }
  } catch {
    return null;
  }

  const m = path.match(ISSUE_PATH_RE);
  if (!m) return null;
  const workspaceId = Number(m[1]);
  const projectId = Number(m[2]);
  const issueId = Number(m[3]);
  if (![workspaceId, projectId, issueId].every(Number.isFinite)) return null;
  return { workspaceId, projectId, issueId };
}

export function issueNodeDocAttrs(issue: {
  id: number;
  workspaceId: number;
  projectId: number;
  issueKey: string;
  title: string;
  status: string;
}) {
  return {
    issueId: issue.id,
    workspaceId: issue.workspaceId,
    projectId: issue.projectId,
    issueKey: issue.issueKey,
    title: issue.title,
    status: issue.status,
  };
}

export function issueShareInitialContent(issue: {
  id: number;
  workspaceId: number;
  projectId: number;
  issueKey: string;
  title: string;
  status: string;
}) {
  return {
    type: "doc" as const,
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "issue",
            attrs: issueNodeDocAttrs(issue),
          },
          { type: "text", text: " " },
        ],
      },
    ],
  };
}
