export type GithubIssueWorkflowPendingAction = "create_branch" | "open_pull";

export type GithubIssueWorkflowPending = {
  v: 1;
  workspaceId: string;
  projectId: string;
  issueId: number;
  action: GithubIssueWorkflowPendingAction;
  headBranchLeaf: string;
  openPrAsDraft: boolean;
  /** `githubRepoId` from installation catalogue. */
  selectedRepoGithubId: string | null;
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

function normalizePending(raw: Record<string, unknown>): GithubIssueWorkflowPending | null {
  if (raw.v !== 1 || typeof raw.createdAt !== "number") return null;
  if (Date.now() - raw.createdAt > MAX_AGE_MS) return null;

  let selectedRepoGithubId: string | null = null;
  if (typeof raw.selectedRepoGithubId === "string" && raw.selectedRepoGithubId.length > 0) {
    selectedRepoGithubId = raw.selectedRepoGithubId;
  }

  const workspaceId = typeof raw.workspaceId === "string" ? raw.workspaceId : "";
  const projectId = typeof raw.projectId === "string" ? raw.projectId : "";
  const issueId = typeof raw.issueId === "number" ? raw.issueId : NaN;
  const action = raw.action === "open_pull" ? "open_pull" : "create_branch";
  const headBranchLeaf = typeof raw.headBranchLeaf === "string" ? raw.headBranchLeaf : "";
  const openPrAsDraft = raw.openPrAsDraft === true;

  if (!workspaceId || !projectId || !Number.isFinite(issueId)) return null;

  return {
    v: 1,
    workspaceId,
    projectId,
    issueId,
    action,
    headBranchLeaf,
    openPrAsDraft,
    selectedRepoGithubId,
    createdAt: raw.createdAt,
  };
}

export function readGithubIssueWorkflowPending(): GithubIssueWorkflowPending | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized = normalizePending(parsed);
    if (!normalized) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return normalized;
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
