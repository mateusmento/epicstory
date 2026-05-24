export type GithubIssueWorkflowPendingAction = "create_branch" | "open_pull";

export type GithubIssueWorkflowPending = {
  v: 1;
  workspaceId: string;
  projectId: string;
  issueId: number;
  action: GithubIssueWorkflowPendingAction;
  headBranchLeaf: string;
  openPrAsDraft: boolean;
  selectedGhLinkId: number | null;
  createdAt: number;
};

const STORAGE_KEY = "epicstory.github_issue_workflow_pending";
const MAX_AGE_MS = 30 * 60 * 1000;

export function issueGithubReturnPath(workspaceId: string, projectId: string, issueId: number): string {
  return `/${workspaceId}/project/${projectId}/issue/${issueId}`;
}

export function saveGithubIssueWorkflowPending(
  pending: Omit<GithubIssueWorkflowPending, "v" | "createdAt">,
): void {
  const payload: GithubIssueWorkflowPending = { v: 1, createdAt: Date.now(), ...pending };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readGithubIssueWorkflowPending(): GithubIssueWorkflowPending | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GithubIssueWorkflowPending;
    if (parsed.v !== 1 || Date.now() - parsed.createdAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearGithubIssueWorkflowPending(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Clears issue branch/PR resume state when it belongs to the given workspace (e.g. after unlink). */
export function clearGithubIssueWorkflowPendingForWorkspace(workspaceId: string): void {
  const pending = readGithubIssueWorkflowPending();
  if (pending?.workspaceId === String(workspaceId)) {
    clearGithubIssueWorkflowPending();
  }
}

export function matchesGithubIssueWorkflowPending(
  pending: GithubIssueWorkflowPending,
  workspaceId: string,
  projectId: string,
  issueId: number,
): boolean {
  return (
    pending.workspaceId === workspaceId && pending.projectId === projectId && pending.issueId === issueId
  );
}
