import { config } from "@/config";
import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi } from "@epicstory/api-client";
import type {
  IGithubCatalogRepository,
  IGithubIntegrationStatus,
  IGithubIssueBranchLink,
  IGithubIssuePullRequestLink,
  IIssue,
} from "@epicstory/contracts";
import { toAsyncDataView } from "@/lib/async";
import { groupGithubPullRequests, type GithubPrStatusFilter } from "@/lib/github";
import { toReactive } from "@vueuse/core";
import type { Ref } from "vue";
import { computed, markRaw, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { suggestGithubBranchLeaf } from "../github-branch-name";
import { githubApiErrorMessage, githubApiParseError } from "../github-api-errors";
import {
  clearGithubIssueWorkflowPending,
  issueGithubReturnPath,
  matchesGithubIssueWorkflowPending,
  readGithubIssueWorkflowPending,
  saveGithubIssueWorkflowPending,
  type GithubIssueWorkflowPendingAction,
} from "../github-issue-workflow-pending";
import { useGithubRepositoryCatalog } from "./use-github-repository-catalog";
import { useGithubWorkspaceAccess } from "./use-github-workspace-access";

export type { GithubPrStatusFilter };

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

export type UseIssueGithubSidebarParams = {
  workspaceId: Ref<string>;
  projectId: Ref<string>;
  issue: Ref<IIssue | undefined>;
  reloadIssueActivityFeed: () => Promise<void>;
  reloadIssue: () => Promise<void>;
};

export function useIssueGithubSidebar(params: UseIssueGithubSidebarParams) {
  const route = useRoute();
  const router = useRouter();
  const githubIntegrationApi = useDependency(GithubIntegrationApi);
  const catalog = useGithubRepositoryCatalog({ pageSize: 100 });

  const pr = reactive({
    data: null as IGithubIssuePullRequestLink[] | null,
    loading: false,
    error: null as string | null,
  });

  const linkedBranches = reactive({
    data: null as IGithubIssueBranchLink[] | null,
    loading: false,
    error: null as string | null,
  });

  const integrationStatus = reactive({
    data: null as IGithubIntegrationStatus | null,
    loading: false,
    error: null as string | null,
  });

  const workflowMutation = reactive({
    busy: false,
    error: null as string | null,
    statusMessage: null as string | null,
    createBranchDialogError: null as string | null,
  });

  const selectedGhRepoId = ref<string | null>(null);
  const ghWorkflowGithubErrorCode = ref<string | undefined>(undefined);
  const headBranchLeaf = ref("");
  const openPrAsDraft = ref(false);
  const prStatusFilter = ref<GithubPrStatusFilter>("all");
  const selectedLinkedBranchId = ref<number | null>(null);
  const createBranchDialogOpen = ref(false);
  const lastAutoResumeAttemptKey = ref<string | null>(null);
  const selectGithubRepoDialogOpen = ref(false);

  const effectiveWorkspaceId = computed(() => {
    const fromIssue = params.issue.value?.workspaceId;
    if (fromIssue != null) return String(fromIssue);
    return params.workspaceId.value;
  });

  const effectiveProjectId = computed(() => {
    const fromIssue = params.issue.value?.projectId;
    if (fromIssue != null) return String(fromIssue);
    return params.projectId.value;
  });

  const { canManageGithubSetup } = useGithubWorkspaceAccess(effectiveWorkspaceId);

  const githubWorkspaceEnabled = computed(() => Boolean(integrationStatus.data?.installation));

  const githubMemberAccountLinked = computed(() => integrationStatus.data?.user != null);

  const showGithubSection = computed(() => {
    if (integrationStatus.loading) return true;
    return githubWorkspaceEnabled.value;
  });

  const githubWorkflowFormVisible = computed(
    () => githubWorkspaceEnabled.value && githubMemberAccountLinked.value,
  );

  const githubNeedsRepoSelection = computed(
    () => githubWorkflowFormVisible.value && selectedGhRepo.value == null,
  );

  const githubAdminNeedsWorkspaceInstall = computed(
    () =>
      canManageGithubSetup.value &&
      !integrationStatus.loading &&
      integrationStatus.data != null &&
      !githubWorkspaceEnabled.value,
  );

  const githubMemberNeedsAccountLink = computed(
    () => githubWorkspaceEnabled.value && !githubMemberAccountLinked.value,
  );

  const githubInstallationMissingOnGithub = computed(
    () => integrationStatus.data?.installationRemoteVerification === "missing_on_github",
  );

  const workflowReconnectSuggested = computed(() =>
    Boolean(
      ghWorkflowGithubErrorCode.value &&
        GITHUB_WORKFLOW_MEMBER_RECONNECT_CODES.has(ghWorkflowGithubErrorCode.value),
    ),
  );

  const prGroups = computed(() => groupGithubPullRequests(pr.data ?? [], prStatusFilter.value));

  const prView = computed(() => ({
    ...toAsyncDataView(pr),
    groups: prGroups.value,
  }));

  const access = computed(() => ({
    adminNeedsWorkspaceInstall: githubAdminNeedsWorkspaceInstall.value,
    memberNeedsAccountLink: githubMemberNeedsAccountLink.value,
    settingsRoute: {
      name: "github-integration-settings" as const,
      params: { workspaceId: effectiveWorkspaceId.value },
    },
  }));

  const selectedLinkedBranch = computed(() => {
    const items = linkedBranches.data ?? [];
    const id = selectedLinkedBranchId.value;
    if (id == null) return items[0] ?? null;
    return items.find((b) => b.id === id) ?? items[0] ?? null;
  });

  const workflowMutationView = computed(() => ({
    busy: workflowMutation.busy,
    error: workflowMutation.error,
    statusMessage: workflowMutation.statusMessage,
    createBranchDialogError: workflowMutation.createBranchDialogError,
    reconnectSuggested: workflowReconnectSuggested.value,
    installationMissingOnGithub: githubInstallationMissingOnGithub.value,
  }));

  const workflowView = computed(() => ({
    formVisible: githubWorkflowFormVisible.value,
    linkedBranches: toAsyncDataView(linkedBranches),
    mutation: workflowMutationView.value,
    selectedLinkedBranch: selectedLinkedBranch.value,
    selectedGhRepoId: selectedGhRepoId.value,
    headBranchLeaf: headBranchLeaf.value,
  }));

  const selectedGhRepo = computed(
    () => catalog.items.find((r) => r.githubRepoId === selectedGhRepoId.value) ?? null,
  );

  function openSelectGithubRepoDialog(): void {
    selectGithubRepoDialogOpen.value = true;
  }

  async function refreshLinkedBranches(issueId: number): Promise<void> {
    linkedBranches.loading = true;
    linkedBranches.error = null;
    try {
      linkedBranches.data = await githubIntegrationApi.listIssueGithubBranches(issueId);
      if (selectedLinkedBranchId.value == null && linkedBranches.data.length > 0) {
        selectedLinkedBranchId.value = linkedBranches.data[0].id;
      }
    } catch (e: unknown) {
      linkedBranches.data = [];
      linkedBranches.error = githubApiErrorMessage(e, "Could not load linked branches.");
    } finally {
      linkedBranches.loading = false;
    }
  }

  function applySelectedBranchToWorkflow(): void {
    const branch = selectedLinkedBranch.value;
    if (!branch) return;
    headBranchLeaf.value = branch.branchName;
    selectedGhRepoId.value = `${branch.owner}/${branch.repoName}`;
  }

  async function createBranchFromDialog(payload: {
    repo: { owner: string; name: string; githubRepoId: string };
    branchName: string;
  }): Promise<void> {
    const iss = params.issue.value;
    if (!iss) return;

    workflowMutation.createBranchDialogError = null;
    try {
      await githubIntegrationApi.createIssueGithubBranch(+effectiveWorkspaceId.value, iss.id, {
        owner: payload.repo.owner,
        name: payload.repo.name,
        branchName: payload.branchName,
      });

      await refreshLinkedBranches(iss.id);
      const newlyLinked =
        linkedBranches.data?.find(
          (b) =>
            b.owner === payload.repo.owner &&
            b.repoName === payload.repo.name &&
            b.branchName === payload.branchName,
        ) ?? null;
      if (newlyLinked) {
        selectedLinkedBranchId.value = newlyLinked.id;
      }
      applySelectedBranchToWorkflow();
      createBranchDialogOpen.value = false;
      await params.reloadIssueActivityFeed();
    } catch (e: unknown) {
      workflowMutation.createBranchDialogError = githubApiErrorMessage(
        e,
        "Could not create branch on GitHub",
      );
    }
  }

  async function onWorkspaceGithubRepoSelected(repo: IGithubCatalogRepository): Promise<void> {
    if (!catalog.items.some((r) => r.githubRepoId === repo.githubRepoId)) {
      catalog.items.push(repo);
    }
    selectedGhRepoId.value = repo.githubRepoId;
    await tryResumePendingGithubWorkflow();
  }

  function applyIssueGithubBranchToForm(iss: IIssue): void {
    const gb = iss.githubBranch;
    if (gb) {
      headBranchLeaf.value = gb.branchName;
      const match = catalog.items.find((r) => r.owner === gb.owner && r.name === gb.repoName);
      if (match) selectedGhRepoId.value = match.githubRepoId;
      return;
    }
    if (!headBranchLeaf.value.trim()) {
      headBranchLeaf.value = suggestGithubBranchLeaf(iss.issueKey, iss.title ?? "");
    }
  }

  async function refreshGithubIssuePullRequests(issueNumericId: number): Promise<void> {
    pr.loading = true;
    pr.error = null;
    try {
      pr.data = await githubIntegrationApi.listIssueGithubPullRequests(issueNumericId);
    } catch (e: unknown) {
      pr.data = [];
      pr.error = githubApiErrorMessage(e, "Could not load GitHub pull requests");
    } finally {
      pr.loading = false;
    }
  }

  async function refreshGithubIntegrationStatus(): Promise<boolean> {
    const wid = effectiveWorkspaceId.value;
    if (!wid) return false;
    integrationStatus.loading = true;
    integrationStatus.error = null;
    try {
      integrationStatus.data = await githubIntegrationApi.getStatus(+wid);
      return true;
    } catch (e: unknown) {
      integrationStatus.data = null;
      integrationStatus.error = githubApiErrorMessage(e, "Could not load GitHub integration status");
      return false;
    } finally {
      integrationStatus.loading = false;
    }
  }

  async function loadWorkspaceCatalog(): Promise<void> {
    const wid = effectiveWorkspaceId.value;
    if (!wid || !integrationStatus.data?.installation) return;
    await catalog.load(+wid);
  }

  function resolveWorkflowRepo(): IGithubCatalogRepository | null {
    const selected = selectedGhRepo.value;
    if (selected) return selected;

    const iss = params.issue.value;
    const gb = iss?.githubBranch;
    if (gb?.owner && gb.repoName) {
      const inCatalog = catalog.items.find((r) => r.owner === gb.owner && r.name === gb.repoName);
      if (inCatalog) return inCatalog;
      return {
        githubRepoId: `${gb.owner}/${gb.repoName}`,
        owner: gb.owner,
        name: gb.repoName,
        fullName: `${gb.owner}/${gb.repoName}`,
        defaultBranch: null,
        private: false,
        htmlUrl: `https://github.com/${gb.owner}/${gb.repoName}`,
      };
    }

    return catalog.items[0] ?? null;
  }

  function memberOAuthStartUrl(returnPath: string): string {
    const url = new URL(`${config.API_URL}/integrations/github/user/start`);
    url.searchParams.set("workspaceId", effectiveWorkspaceId.value);
    url.searchParams.set("redirect", returnPath);
    return url.toString();
  }

  function redirectToGithubIntegrations(): void {
    router.push({
      name: "github-integration-settings",
      params: { workspaceId: effectiveWorkspaceId.value },
    });
  }

  function redirectToMemberGithubLink(issueId: number): void {
    const returnPath = issueGithubReturnPath(effectiveWorkspaceId.value, effectiveProjectId.value, issueId);
    workflowMutation.statusMessage = "Redirecting to link your GitHub account…";
    window.location.assign(memberOAuthStartUrl(returnPath));
  }

  function applyPendingFormState(pending: ReturnType<typeof readGithubIssueWorkflowPending>): void {
    if (!pending) return;
    headBranchLeaf.value = pending.headBranchLeaf;
    openPrAsDraft.value = pending.openPrAsDraft;
    if (
      pending.selectedRepoGithubId != null &&
      (catalog.items.some((r) => r.githubRepoId === pending.selectedRepoGithubId) ||
        pending.selectedRepoGithubId.includes("/"))
    ) {
      selectedGhRepoId.value = pending.selectedRepoGithubId;
    }
  }

  function pendingAutoResumeGateKey(): string {
    return [
      integrationStatus.data?.user?.githubLogin ?? "",
      String(catalog.items.length),
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
    const statusLoaded = await refreshGithubIntegrationStatus();
    if (!statusLoaded) {
      return { kind: "status_unavailable" };
    }

    const refreshWorkspaceRepos = options?.refreshWorkspaceRepos ?? true;
    if (refreshWorkspaceRepos && (catalog.loading || catalog.items.length === 0)) {
      await loadWorkspaceCatalog();
    }

    if (githubInstallationMissingOnGithub.value) {
      return { kind: "installation_gone" };
    }

    const s = integrationStatus.data;
    if (!s?.installation) {
      return { kind: "workspace_install" };
    }

    if (!githubMemberAccountLinked.value) {
      return { kind: "member_link" };
    }

    const override = options?.repoOverride;
    if (override?.owner?.trim() && override?.repoName?.trim()) {
      const owner = override.owner.trim();
      const name = override.repoName.trim();
      const inCatalog = catalog.items.find((r) => r.owner === owner && r.name === name);
      const repo: IGithubCatalogRepository =
        inCatalog ??
        ({
          githubRepoId: `${owner}/${name}`,
          owner,
          name,
          fullName: `${owner}/${name}`,
          defaultBranch: null,
          private: false,
          htmlUrl: `https://github.com/${owner}/${name}`,
        } as IGithubCatalogRepository);
      return { kind: "ready", repo };
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
        integrationStatus.error ?? "Could not load GitHub integration status. Try again.";
      return;
    }
    if (prereq.kind === "installation_gone") {
      workflowMutation.error =
        "GitHub no longer has this workspace installation. Ask an admin to reinstall the app.";
      return;
    }
    if (prereq.kind === "workspace_install") {
      if (canManageGithubSetup.value) {
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
        workspaceId: effectiveWorkspaceId.value,
        projectId: effectiveProjectId.value,
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

    const ws = effectiveWorkspaceId.value;
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
      await refreshGithubIssuePullRequests(iss.id);
      await refreshLinkedBranches(iss.id);
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

    const ws = effectiveWorkspaceId.value;
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
      await refreshGithubIssuePullRequests(iss.id);
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
    if (!iss || workflowMutation.busy || catalog.loading || integrationStatus.loading) {
      return;
    }

    const pending = readGithubIssueWorkflowPending();
    if (
      !pending ||
      !matchesGithubIssueWorkflowPending(
        pending,
        effectiveWorkspaceId.value,
        effectiveProjectId.value,
        iss.id,
      )
    ) {
      return;
    }
    const attemptKey = `${pending.createdAt}|${pendingAutoResumeGateKey()}`;
    if (lastAutoResumeAttemptKey.value === attemptKey) {
      return;
    }

    const prereq = await resolveGithubWorkflowPrerequisites({
      refreshWorkspaceRepos: catalog.items.length === 0,
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
    const wid = effectiveWorkspaceId.value;
    const pj = effectiveProjectId.value;
    if (!iss || !wid || !pj || workflowMutation.busy || githubInstallationMissingOnGithub.value) {
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

  watch(
    () => params.issue.value?.id,
    (id) => {
      headBranchLeaf.value = "";
      selectedGhRepoId.value = null;
      selectedLinkedBranchId.value = null;
      workflowMutation.createBranchDialogError = null;
      if (id == null) {
        pr.data = [];
        pr.error = null;
        linkedBranches.data = [];
        linkedBranches.error = null;
        return;
      }
      refreshGithubIssuePullRequests(id);
      refreshLinkedBranches(id).then(() => applySelectedBranchToWorkflow());
    },
    { immediate: true },
  );

  watch(
    [() => params.issue.value, () => catalog.items],
    ([iss]) => {
      if (!iss) return;
      applyIssueGithubBranchToForm(iss);
    },
    { immediate: true, deep: true },
  );

  watch(
    () => selectedLinkedBranch.value?.id,
    () => applySelectedBranchToWorkflow(),
  );

  watch(
    () => effectiveWorkspaceId.value,
    async (wid) => {
      integrationStatus.data = null;
      integrationStatus.error = null;
      catalog.reset();
      selectedGhRepoId.value = null;
      if (!wid) return;
      await refreshGithubIntegrationStatus();
    },
    { immediate: true },
  );

  watch(
    () => integrationStatus.data?.installation?.id,
    async (installationId) => {
      if (installationId == null) {
        catalog.reset();
        return;
      }
      await loadWorkspaceCatalog();
    },
  );

  watch(
    () => ({
      issueId: params.issue.value?.id,
      dataReady: !catalog.loading && !integrationStatus.loading,
      resumeGate: pendingAutoResumeGateKey(),
    }),
    ({ issueId, dataReady }) => {
      if (issueId == null || !dataReady) return;
      tryResumePendingGithubWorkflow();
    },
  );

  return toReactive({
    prView,
    access,
    workflowView,
    showGithubSection,
    prStatusFilter,
    selectedLinkedBranchId,
    createBranchDialogOpen,
    openPrAsDraft,
    headBranchLeaf,
    selectedGhRepoId,
    openGithubPull: markRaw(openGithubPull),
    createBranchFromDialog: markRaw(createBranchFromDialog),
    onWorkspaceGithubRepoSelected: markRaw(onWorkspaceGithubRepoSelected),
    openSelectGithubRepoDialog: markRaw(openSelectGithubRepoDialog),
    selectGithubRepoDialogOpen,
    githubNeedsRepoSelection,
  });
}
