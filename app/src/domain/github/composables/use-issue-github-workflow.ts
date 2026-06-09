import { config } from "@/config";
import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi } from "@epicstory/api-client";
import type { IGithubCatalogRepository, IGithubIssueBranchLink, IIssue } from "@epicstory/contracts";
import type { Ref } from "vue";
import { computed, markRaw, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { githubApiParseError } from "../github-api-errors";
import type { GithubWorkflowMutation } from "@/lib/github";
import { suggestGithubBranchLeaf } from "../github-branch-name";
import {
  clearGithubIssueWorkflowPending,
  issueGithubReturnPath,
  matchesGithubIssueWorkflowPending,
  readGithubIssueWorkflowPending,
  saveGithubIssueWorkflowPending,
  type GithubIssueWorkflowPendingAction,
} from "../github-issue-workflow-pending";
import type { GithubIntegrationContext } from "./use-github-integration-context";

/** Server tells the client to complete Integrations → GitHub linking before retrying. */
const GITHUB_WORKFLOW_MEMBER_RECONNECT_CODES = new Set<string>([
  "GITHUB_MEMBER_OAUTH_REQUIRED",
  "GITHUB_MEMBER_REAUTHORIZE_REQUIRED",
  "GITHUB_MEMBER_TOKEN_EXPIRED",
  "GITHUB_MEMBER_TOKEN_DECRYPT_FAILED",
]);

type GithubWorkflowPrerequisite =
  | { kind: "ready"; repo: IGithubCatalogRepository }
  | { kind: "installation_gone" }
  | { kind: "workspace_install" }
  | { kind: "member_link" }
  | { kind: "select_repo" }
  | { kind: "status_unavailable" };

export type UseIssueGithubWorkflowParams = {
  issue: Ref<IIssue | undefined>;
  integration: GithubIntegrationContext;
  reloadPullRequests: (issueId: number) => Promise<void>;
  refreshLinkedBranches: (issueId: number) => Promise<void>;
  reloadIssue: () => Promise<void>;
  reloadIssueActivityFeed: () => Promise<void>;
};

function catalogRepoStub(owner: string, name: string): IGithubCatalogRepository {
  return {
    githubRepoId: `${owner}/${name}`,
    owner,
    name,
    fullName: `${owner}/${name}`,
    defaultBranch: null,
    private: false,
    htmlUrl: `https://github.com/${owner}/${name}`,
  };
}

export function useIssueGithubWorkflow(params: UseIssueGithubWorkflowParams) {
  const route = useRoute();
  const router = useRouter();
  const githubIntegrationApi = useDependency(GithubIntegrationApi);
  const integration = params.integration;

  const workspaceId = computed(() => String(params.issue.value?.workspaceId));
  const projectId = computed(() => String(params.issue.value?.projectId));

  const workflowMutation = reactive({
    busy: false,
    error: null as string | null,
    statusMessage: null as string | null,
  });

  const selectedGhRepoId = ref<string | null>(null);
  const ghWorkflowGithubErrorCode = ref<string | undefined>(undefined);
  const headBranchLeaf = ref("");
  const openPrAsDraft = ref(false);
  const lastAutoResumeAttemptKey = ref<string | null>(null);
  const selectGithubRepoDialogOpen = ref(false);

  const selectedGhRepo = computed(
    () => integration.catalog.items.find((r) => r.githubRepoId === selectedGhRepoId.value) ?? null,
  );

  const githubNeedsRepoSelection = computed(
    () => integration.workflowFormVisible && selectedGhRepo.value == null,
  );

  const workflowReconnectSuggested = computed(() =>
    Boolean(
      ghWorkflowGithubErrorCode.value &&
        GITHUB_WORKFLOW_MEMBER_RECONNECT_CODES.has(ghWorkflowGithubErrorCode.value),
    ),
  );

  const workflowMutationView = computed(
    (): GithubWorkflowMutation => ({
      busy: workflowMutation.busy,
      error: workflowMutation.error,
      statusMessage: workflowMutation.statusMessage,
      reconnectSuggested: workflowReconnectSuggested.value,
      installationMissingOnGithub: integration.installationMissingOnGithub,
    }),
  );

  function openSelectGithubRepoDialog(): void {
    selectGithubRepoDialogOpen.value = true;
  }

  function applyLinkedBranch(branch: IGithubIssueBranchLink | null): void {
    if (!branch) return;
    headBranchLeaf.value = branch.branchName;
    selectedGhRepoId.value = `${branch.owner}/${branch.repoName}`;
  }

  function resetFormState(): void {
    headBranchLeaf.value = "";
    selectedGhRepoId.value = null;
  }

  function applyIssueGithubBranchToForm(iss: IIssue): void {
    const gb = iss.githubBranch;
    if (gb) {
      headBranchLeaf.value = gb.branchName;
      const match = integration.catalog.items.find((r) => r.owner === gb.owner && r.name === gb.repoName);
      if (match) selectedGhRepoId.value = match.githubRepoId;
      return;
    }
    if (!headBranchLeaf.value.trim()) {
      headBranchLeaf.value = suggestGithubBranchLeaf(iss.issueKey, iss.title ?? "");
    }
  }

  function resolveWorkflowRepo(): IGithubCatalogRepository | null {
    const selected = selectedGhRepo.value;
    if (selected) return selected;

    const iss = params.issue.value;
    const gb = iss?.githubBranch;
    if (gb?.owner && gb.repoName) {
      const inCatalog = integration.catalog.items.find((r) => r.owner === gb.owner && r.name === gb.repoName);
      if (inCatalog) return inCatalog;
      return catalogRepoStub(gb.owner, gb.repoName);
    }

    return integration.catalog.items[0] ?? null;
  }

  function memberOAuthStartUrl(returnPath: string): string {
    const url = new URL(`${config.API_URL}/integrations/github/user/start`);
    url.searchParams.set("workspaceId", workspaceId.value);
    url.searchParams.set("redirect", returnPath);
    return url.toString();
  }

  function redirectToGithubIntegrations(): void {
    router.push({
      name: "github-integration-settings",
      params: { workspaceId: workspaceId.value },
    });
  }

  function redirectToMemberGithubLink(issueId: number): void {
    const returnPath = issueGithubReturnPath(workspaceId.value, projectId.value, issueId);
    workflowMutation.statusMessage = "Redirecting to link your GitHub account…";
    window.location.assign(memberOAuthStartUrl(returnPath));
  }

  function applyPendingFormState(pending: ReturnType<typeof readGithubIssueWorkflowPending>): void {
    if (!pending) return;
    headBranchLeaf.value = pending.headBranchLeaf;
    openPrAsDraft.value = pending.openPrAsDraft;
    if (
      pending.selectedRepoGithubId != null &&
      (integration.catalog.items.some((r) => r.githubRepoId === pending.selectedRepoGithubId) ||
        pending.selectedRepoGithubId.includes("/"))
    ) {
      selectedGhRepoId.value = pending.selectedRepoGithubId;
    }
  }

  function pendingAutoResumeGateKey(): string {
    return [
      integration.integrationStatus.data?.user?.githubLogin ?? "",
      String(integration.catalog.items.length),
      String(route.query.github_oauth_success ?? ""),
    ].join("|");
  }

  type ResolveGithubWorkflowPrerequisitesOptions = {
    refreshWorkspaceRepos?: boolean;
    repoOverride?: { owner: string; repoName: string };
  };

  async function resolveGithubWorkflowPrerequisites(
    options?: ResolveGithubWorkflowPrerequisitesOptions,
  ): Promise<GithubWorkflowPrerequisite> {
    const statusLoaded = await integration.refreshStatus();
    if (!statusLoaded) {
      return { kind: "status_unavailable" };
    }

    const refreshWorkspaceRepos = options?.refreshWorkspaceRepos ?? true;
    if (refreshWorkspaceRepos && (integration.catalog.loading || integration.catalog.items.length === 0)) {
      await integration.loadCatalog();
    }

    if (integration.installationMissingOnGithub) {
      return { kind: "installation_gone" };
    }

    const s = integration.integrationStatus.data;
    if (!s?.installation) {
      return { kind: "workspace_install" };
    }

    if (!integration.memberAccountLinked) {
      return { kind: "member_link" };
    }

    const override = options?.repoOverride;
    if (override?.owner?.trim() && override?.repoName?.trim()) {
      const owner = override.owner.trim();
      const name = override.repoName.trim();
      const inCatalog = integration.catalog.items.find((r) => r.owner === owner && r.name === name);
      return { kind: "ready", repo: inCatalog ?? catalogRepoStub(owner, name) };
    }

    const repo = resolveWorkflowRepo();
    if (!repo) return { kind: "select_repo" };
    return { kind: "ready", repo };
  }

  function handleGithubWorkflowPrerequisiteFailure(
    prereq: GithubWorkflowPrerequisite,
    issueId: number,
    action: GithubIssueWorkflowPendingAction,
  ): void {
    if (prereq.kind === "status_unavailable") {
      workflowMutation.error =
        integration.integrationStatus.error ?? "Could not load GitHub integration status. Try again.";
      return;
    }
    if (prereq.kind === "installation_gone") {
      workflowMutation.error =
        "GitHub no longer has this workspace installation. Ask an admin to reinstall the app.";
      return;
    }
    if (prereq.kind === "workspace_install") {
      if (integration.canManageGithubSetup) {
        workflowMutation.error =
          "Install the GitHub App for this workspace before creating branches from issues.";
        redirectToGithubIntegrations();
      } else {
        workflowMutation.error =
          "GitHub is not enabled for this workspace yet. Ask a workspace admin to install the GitHub App under Integrations.";
      }
      return;
    }
    if (prereq.kind === "member_link") {
      redirectToMemberGithubLink(issueId);
      return;
    }
    if (prereq.kind === "select_repo") {
      openSelectGithubRepoDialog();
      return;
    }
    workflowMutation.error =
      action === "create_branch"
        ? "Could not create branch — check GitHub setup and linked repo."
        : "Could not open pull request — check GitHub setup and linked repo.";
  }

  function handleGithubWorkflowApiError(
    e: unknown,
    fallback: string,
    issueId: number,
    action: GithubIssueWorkflowPendingAction,
  ): void {
    const parsed = githubApiParseError(e, fallback);
    if (parsed.githubErrorCode && GITHUB_WORKFLOW_MEMBER_RECONNECT_CODES.has(parsed.githubErrorCode)) {
      saveGithubIssueWorkflowPending({
        workspaceId: workspaceId.value,
        projectId: projectId.value,
        issueId,
        action,
        headBranchLeaf: headBranchLeaf.value,
        openPrAsDraft: openPrAsDraft.value,
        selectedRepoGithubId: selectedGhRepoId.value,
      });
      redirectToMemberGithubLink(issueId);
      return;
    }
    workflowMutation.error = parsed.message;
    ghWorkflowGithubErrorCode.value = parsed.githubErrorCode;
  }

  type ExecuteGithubWorkflowOptions = {
    prerequisitesResolved?: boolean;
  };

  async function executeCreateGithubBranch(
    iss: IIssue,
    repo: IGithubCatalogRepository,
    options?: ExecuteGithubWorkflowOptions,
  ): Promise<void> {
    let targetRepo = repo;
    if (!options?.prerequisitesResolved) {
      const prereq = await resolveGithubWorkflowPrerequisites();
      if (prereq.kind !== "ready") {
        handleGithubWorkflowPrerequisiteFailure(prereq, iss.id, "create_branch");
        return;
      }
      targetRepo = prereq.repo;
    }

    const ws = workspaceId.value;
    workflowMutation.busy = true;
    workflowMutation.statusMessage = "Creating branch on GitHub…";
    workflowMutation.error = null;
    ghWorkflowGithubErrorCode.value = undefined;
    try {
      const branchName = headBranchLeaf.value.trim();
      const res = await githubIntegrationApi.createIssueGithubBranch(+ws, iss.id, {
        owner: targetRepo.owner,
        name: targetRepo.name,
        ...(branchName ? { branchName } : {}),
      });
      headBranchLeaf.value = res.branchName;
      clearGithubIssueWorkflowPending();
      await params.reloadIssue();
      await params.reloadPullRequests(iss.id);
      await params.refreshLinkedBranches(iss.id);
      await params.reloadIssueActivityFeed();
    } catch (e: unknown) {
      const parsed = githubApiParseError(e, "Could not create branch");
      const existingBranch = parsed.message.match(/^Branch "([^"]+)" already exists/);
      if (existingBranch?.[1]) {
        headBranchLeaf.value = existingBranch[1];
        clearGithubIssueWorkflowPending();
        workflowMutation.error = parsed.message;
        return;
      }
      handleGithubWorkflowApiError(e, "Could not create branch", iss.id, "create_branch");
    } finally {
      workflowMutation.busy = false;
      workflowMutation.statusMessage = null;
    }
  }

  async function executeOpenGithubPull(
    iss: IIssue,
    repo: IGithubCatalogRepository,
    options?: ExecuteGithubWorkflowOptions,
  ): Promise<void> {
    let targetRepo = repo;
    if (!options?.prerequisitesResolved) {
      const prereq = await resolveGithubWorkflowPrerequisites();
      if (prereq.kind !== "ready") {
        handleGithubWorkflowPrerequisiteFailure(prereq, iss.id, "open_pull");
        return;
      }
      targetRepo = prereq.repo;
    }

    const head = headBranchLeaf.value.trim();
    if (!head) {
      workflowMutation.error = "Set a branch name (create a branch first, or paste the head branch).";
      return;
    }

    const ws = workspaceId.value;
    workflowMutation.busy = true;
    workflowMutation.statusMessage = "Opening pull request on GitHub…";
    workflowMutation.error = null;
    ghWorkflowGithubErrorCode.value = undefined;
    try {
      await githubIntegrationApi.createIssueGithubPull(+ws, iss.id, {
        owner: targetRepo.owner,
        name: targetRepo.name,
        headBranch: head,
        title: iss.title?.trim()?.length && iss.title ? iss.title : iss.issueKey,
        draft: openPrAsDraft.value,
      });
      clearGithubIssueWorkflowPending();
      await params.reloadPullRequests(iss.id);
      await params.reloadIssueActivityFeed();
    } catch (e: unknown) {
      handleGithubWorkflowApiError(e, "Could not open pull request", iss.id, "open_pull");
    } finally {
      workflowMutation.busy = false;
      workflowMutation.statusMessage = null;
    }
  }

  async function tryResumePendingGithubWorkflow(): Promise<void> {
    const iss = params.issue.value;
    if (
      !iss ||
      workflowMutation.busy ||
      integration.catalog.loading ||
      integration.integrationStatus.loading
    ) {
      return;
    }

    const pending = readGithubIssueWorkflowPending();
    if (!pending || !matchesGithubIssueWorkflowPending(pending, workspaceId.value, projectId.value, iss.id)) {
      return;
    }
    const attemptKey = `${pending.createdAt}|${pendingAutoResumeGateKey()}`;
    if (lastAutoResumeAttemptKey.value === attemptKey) {
      return;
    }

    const prereq = await resolveGithubWorkflowPrerequisites({
      refreshWorkspaceRepos: integration.catalog.items.length === 0,
    });
    if (prereq.kind !== "ready") {
      lastAutoResumeAttemptKey.value = attemptKey;
      return;
    }

    applyPendingFormState(pending);
    lastAutoResumeAttemptKey.value = attemptKey;

    if (pending.action === "create_branch") {
      await executeCreateGithubBranch(iss, prereq.repo, { prerequisitesResolved: true });
    } else {
      await executeOpenGithubPull(iss, prereq.repo, { prerequisitesResolved: true });
    }
  }

  async function beginGithubWorkflow(
    action: GithubIssueWorkflowPendingAction,
    opts?: { repoOverride?: { owner: string; repoName: string } },
  ): Promise<void> {
    const iss = params.issue.value;
    const wid = workspaceId.value;
    const pj = projectId.value;
    if (!iss || !wid || !pj || workflowMutation.busy || integration.installationMissingOnGithub) {
      return;
    }

    saveGithubIssueWorkflowPending({
      workspaceId: wid,
      projectId: pj,
      issueId: iss.id,
      action,
      headBranchLeaf: headBranchLeaf.value,
      openPrAsDraft: openPrAsDraft.value,
      selectedRepoGithubId: selectedGhRepoId.value,
    });

    workflowMutation.busy = true;
    workflowMutation.statusMessage = "Checking GitHub setup…";
    workflowMutation.error = null;
    ghWorkflowGithubErrorCode.value = undefined;

    let prereq: GithubWorkflowPrerequisite;
    try {
      prereq = await resolveGithubWorkflowPrerequisites({
        repoOverride: opts?.repoOverride,
      });
    } finally {
      workflowMutation.busy = false;
      if (workflowMutation.statusMessage === "Checking GitHub setup…") {
        workflowMutation.statusMessage = null;
      }
    }

    if (prereq.kind !== "ready") {
      handleGithubWorkflowPrerequisiteFailure(prereq, iss.id, action);
      return;
    }

    if (action === "create_branch") {
      await executeCreateGithubBranch(iss, prereq.repo, { prerequisitesResolved: true });
    } else {
      await executeOpenGithubPull(iss, prereq.repo, { prerequisitesResolved: true });
    }
  }

  async function openGithubPull(opts?: {
    owner: string;
    repoName: string;
    branchName: string;
  }): Promise<void> {
    const overrideOwner = opts?.owner?.trim();
    const overrideRepo = opts?.repoName?.trim();
    const overrideBranch = opts?.branchName?.trim();

    if (overrideBranch) {
      headBranchLeaf.value = overrideBranch;
    }

    if (!headBranchLeaf.value.trim()) {
      workflowMutation.error = "Select or create a branch before opening a pull request.";
      return;
    }

    await beginGithubWorkflow("open_pull", {
      repoOverride:
        overrideOwner && overrideRepo ? { owner: overrideOwner, repoName: overrideRepo } : undefined,
    });
  }

  async function onWorkspaceGithubRepoSelected(repo: IGithubCatalogRepository): Promise<void> {
    if (!integration.catalog.items.some((r) => r.githubRepoId === repo.githubRepoId)) {
      integration.catalog.items.push(repo);
    }
    selectedGhRepoId.value = repo.githubRepoId;
    await tryResumePendingGithubWorkflow();
  }

  watch(
    () => ({
      issueId: params.issue.value?.id,
      dataReady: !integration.catalog.loading && !integration.integrationStatus.loading,
      resumeGate: pendingAutoResumeGateKey(),
    }),
    ({ issueId, dataReady }) => {
      if (issueId == null || !dataReady) return;
      tryResumePendingGithubWorkflow();
    },
  );

  return reactive({
    headBranchLeaf,
    openPrAsDraft,
    selectedGhRepoId,
    selectGithubRepoDialogOpen,
    githubNeedsRepoSelection,
    workflowMutationView,
    applyLinkedBranch: markRaw(applyLinkedBranch),
    resetFormState: markRaw(resetFormState),
    applyIssueGithubBranchToForm: markRaw(applyIssueGithubBranchToForm),
    openGithubPull: markRaw(openGithubPull),
    openSelectGithubRepoDialog: markRaw(openSelectGithubRepoDialog),
    onWorkspaceGithubRepoSelected: markRaw(onWorkspaceGithubRepoSelected),
  });
}

export type IssueGithubWorkflow = ReturnType<typeof useIssueGithubWorkflow>;
