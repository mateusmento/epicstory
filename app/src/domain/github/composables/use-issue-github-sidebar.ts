import { config } from "@/config";
import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi, IssueApi } from "@epicstory/api-client";
import type {
  IGithubIntegrationStatus,
  IGithubIssuePullRequestLink,
  IGithubCatalogRepository,
  IIssue,
  IIssueGithubBranch,
} from "@epicstory/contracts";
import type { ComputedRef, Ref } from "vue";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { suggestGithubBranchLeaf } from "../github-branch-name";
import { githubApiErrorMessage, githubApiParseError } from "../github-api-errors";
import { useGithubWorkspaceAccess } from "./use-github-workspace-access";
import {
  clearGithubIssueWorkflowPending,
  issueGithubReturnPath,
  matchesGithubIssueWorkflowPending,
  readGithubIssueWorkflowPending,
  saveGithubIssueWorkflowPending,
  type GithubIssueWorkflowPendingAction,
} from "../github-issue-workflow-pending";

/** Server tells the client to complete Integrations → GitHub linking before retrying. */
const GITHUB_WORKFLOW_MEMBER_RECONNECT_CODES = new Set<string>([
  "GITHUB_MEMBER_OAUTH_REQUIRED",
  "GITHUB_MEMBER_REAUTHORIZE_REQUIRED",
  "GITHUB_MEMBER_TOKEN_EXPIRED",
  "GITHUB_MEMBER_TOKEN_DECRYPT_FAILED",
]);

export type GithubPrStatusFilter = "all" | "open" | "merged" | "closed";

type GithubWorkflowPrerequisite =
  | { kind: "ready"; repo: IGithubCatalogRepository }
  | { kind: "installation_gone" }
  | { kind: "workspace_install" }
  | { kind: "member_link" }
  | { kind: "select_repo" }
  | { kind: "status_unavailable" };

function matchesGithubPrFilter(pr: IGithubIssuePullRequestLink, filter: GithubPrStatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "merged") return pr.merged === true;
  if (filter === "closed") return pr.merged === false && pr.state === "closed";
  return pr.merged === false && pr.state === "open";
}

export type UseIssueGithubSidebarParams = {
  workspaceId: Ref<string>;
  projectId: Ref<string>;
  /** Current issue loaded in the shell (undefined while loading). */
  issue: Ref<IIssue | undefined>;
  /** Called after branch/PR mutations so the timeline can refresh (parent owns the activity section ref). */
  reloadIssueActivityFeed: () => Promise<void>;
  /** Refetch issue so persisted `githubBranch` is loaded after create/select. */
  reloadIssue: () => Promise<void>;
};

export type UseIssueGithubSidebarReturn = {
  githubPullRequests: Ref<IGithubIssuePullRequestLink[]>;
  githubPullRequestsLoading: Ref<boolean>;
  githubPullRequestsError: Ref<string | null>;

  workspaceGhRepos: Ref<IGithubCatalogRepository[]>;
  workspaceGhReposLoading: Ref<boolean>;
  workspaceGhReposError: Ref<string | null>;

  selectedGhRepoId: Ref<string | null>;
  selectedGhRepo: ComputedRef<IGithubCatalogRepository | null>;

  ghWorkflowBusy: Ref<boolean>;
  ghWorkflowStatusMessage: Ref<string | null>;
  ghWorkflowError: Ref<string | null>;
  ghWorkflowReconnectSuggested: ComputedRef<boolean>;
  /** Shown when workspace has no GitHub App installation (non-members do not see the section). */
  showGithubSection: ComputedRef<boolean>;
  canManageGithubSetup: ComputedRef<boolean>;
  githubWorkspaceEnabled: ComputedRef<boolean>;
  githubWorkflowFormVisible: ComputedRef<boolean>;
  githubNeedsRepoSelection: ComputedRef<boolean>;
  githubAdminNeedsWorkspaceInstall: ComputedRef<boolean>;
  githubMemberNeedsAccountLink: ComputedRef<boolean>;

  githubInstallationMissingOnGithub: ComputedRef<boolean>;
  githubIntegrationStatusError: Ref<string | null>;
  selectGithubRepoDialogOpen: Ref<boolean>;
  githubBranchPickerOpen: Ref<boolean>;
  githubBranchSearch: Ref<string>;
  githubRepoBranchesLoading: Ref<boolean>;
  githubRepoBranchesError: Ref<string | null>;
  githubRepoBranchesHasMore: Ref<boolean>;
  filteredGithubRepoBranches: ComputedRef<{ name: string }[]>;
  githubRepoBranchesLoadingMore: Ref<boolean>;
  createBranchPickerDisabled: ComputedRef<boolean>;
  createBranchPickerLabel: ComputedRef<string>;
  githubBranchTriggerLabel: ComputedRef<string | null>;
  /** Persisted active branch from issue fetch (verified against GitHub on load). */
  activeGithubBranch: ComputedRef<IIssueGithubBranch | null | undefined>;
  headBranchLeaf: Ref<string>;
  openPrAsDraft: Ref<boolean>;

  prStatusFilter: Ref<GithubPrStatusFilter>;
  githubPullRequestGroups: ComputedRef<{ fullName: string; pullRequests: IGithubIssuePullRequestLink[] }[]>;

  openSelectGithubRepoDialog: () => void;
  onGithubBranchPickerOpenChange: (open: boolean) => Promise<void>;
  loadMoreGithubRepoBranches: () => Promise<void>;
  selectGithubBranch: (branchName: string) => Promise<void>;
  createGithubBranchFromPicker: () => Promise<void>;
  onWorkspaceGithubRepoSelected: (repo: IGithubCatalogRepository) => Promise<void>;
  openGithubPull: () => Promise<void>;
};

export function useIssueGithubSidebar(params: UseIssueGithubSidebarParams): UseIssueGithubSidebarReturn {
  const route = useRoute();
  const router = useRouter();
  const githubIntegrationApi = useDependency(GithubIntegrationApi);
  const issueApi = useDependency(IssueApi);

  const githubPullRequests = ref<IGithubIssuePullRequestLink[]>([]);
  const githubPullRequestsLoading = ref(false);
  const githubPullRequestsError = ref<string | null>(null);

  const workspaceGhRepos = ref<IGithubCatalogRepository[]>([]);
  const workspaceGhReposLoading = ref(false);
  const workspaceGhReposError = ref<string | null>(null);
  const selectedGhRepoId = ref<string | null>(null);

  const ghWorkflowBusy = ref(false);
  const ghWorkflowStatusMessage = ref<string | null>(null);
  const ghWorkflowError = ref<string | null>(null);
  const ghWorkflowGithubErrorCode = ref<string | undefined>(undefined);
  const headBranchLeaf = ref("");
  const openPrAsDraft = ref(false);
  const githubBranchPickerOpen = ref(false);
  const githubBranchSearch = ref("");
  const githubRepoBranches = ref<{ name: string }[]>([]);
  const githubRepoBranchesLoading = ref(false);
  const githubRepoBranchesLoadingMore = ref(false);
  const githubRepoBranchesError = ref<string | null>(null);
  const githubRepoBranchesHasMore = ref(false);
  const githubRepoBranchesPage = ref(1);
  const GITHUB_REPO_BRANCHES_PAGE_SIZE = 30;
  const prStatusFilter = ref<GithubPrStatusFilter>("all");

  const githubIntegrationStatus = ref<IGithubIntegrationStatus | null>(null);
  const githubIntegrationStatusLoading = ref(false);
  const githubIntegrationStatusError = ref<string | null>(null);
  /** Suppress repeated auto-resume for the same pending + integration/repo snapshot (not loading flags). */
  const lastAutoResumeAttemptKey = ref<string | null>(null);

  /** Prefer issue entity ids so repo/status match the issue's project (not only the route). */
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

  const selectGithubRepoDialogOpen = ref(false);

  const activeGithubBranch = computed(() => params.issue.value?.githubBranch ?? null);

  const githubWorkspaceEnabled = computed(() => Boolean(githubIntegrationStatus.value?.installation));

  const showGithubSection = computed(() => {
    if (githubIntegrationStatusLoading.value) return true;
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
      !githubIntegrationStatusLoading.value &&
      githubIntegrationStatus.value != null &&
      !githubWorkspaceEnabled.value,
  );

  const githubMemberNeedsAccountLink = computed(
    () => githubWorkspaceEnabled.value && !githubMemberAccountLinked.value,
  );

  function openSelectGithubRepoDialog(): void {
    selectGithubRepoDialogOpen.value = true;
  }

  async function onWorkspaceGithubRepoSelected(repo: IGithubCatalogRepository): Promise<void> {
    if (!workspaceGhRepos.value.some((r) => r.githubRepoId === repo.githubRepoId)) {
      workspaceGhRepos.value = [...workspaceGhRepos.value, repo];
    }
    selectedGhRepoId.value = repo.githubRepoId;
    await tryResumePendingGithubWorkflow();
  }

  function applyIssueGithubBranchToForm(iss: IIssue): void {
    const gb = iss.githubBranch;
    if (gb) {
      headBranchLeaf.value = gb.branchName;
      const match = workspaceGhRepos.value.find((r) => r.owner === gb.owner && r.name === gb.repoName);
      if (match) selectedGhRepoId.value = match.githubRepoId;
      return;
    }
    if (!headBranchLeaf.value.trim()) {
      headBranchLeaf.value = suggestGithubBranchLeaf(iss.id, iss.title ?? "");
    }
  }

  const filteredGithubRepoBranches = computed(() => {
    const q = githubBranchSearch.value.trim().toLowerCase();
    if (!q) return githubRepoBranches.value;
    return githubRepoBranches.value.filter((b) => b.name.toLowerCase().includes(q));
  });

  const createBranchTargetName = computed(() => {
    const iss = params.issue.value;
    const q = githubBranchSearch.value.trim();
    return q || (iss ? suggestGithubBranchLeaf(iss.id, iss.title ?? "") : "");
  });

  const createBranchPickerLabel = computed(() => {
    const name = createBranchTargetName.value || "branch";
    return `Create branch "${name}"`;
  });

  const createBranchPickerDisabled = computed(() => {
    const target = createBranchTargetName.value;
    if (!target) return false;
    return githubRepoBranches.value.some((b) => b.name === target);
  });

  const githubBranchTriggerLabel = computed((): string | null => {
    const b = activeGithubBranch.value;
    if (!b?.branchName) return null;
    if (!b.existsOnGithub) return `${b.branchName} (not on GitHub)`;
    return b.branchName;
  });

  async function loadGithubRepoBranches(reset: boolean): Promise<void> {
    const repo = selectedGhRepo.value;
    const wid = effectiveWorkspaceId.value;
    if (!repo || !wid) return;

    if (reset) {
      githubRepoBranchesPage.value = 1;
      githubRepoBranches.value = [];
    }

    if (reset) {
      githubRepoBranchesLoading.value = true;
    } else {
      githubRepoBranchesLoadingMore.value = true;
    }
    githubRepoBranchesError.value = null;
    try {
      const res = await githubIntegrationApi.listRepositoryBranches(+wid, repo.owner, repo.name, {
        page: githubRepoBranchesPage.value,
        size: GITHUB_REPO_BRANCHES_PAGE_SIZE,
      });
      if (reset) {
        githubRepoBranches.value = res.branches;
      } else {
        githubRepoBranches.value = [...githubRepoBranches.value, ...res.branches];
      }
      githubRepoBranchesHasMore.value = res.hasNextPage;
    } catch (e: unknown) {
      if (reset) githubRepoBranches.value = [];
      githubRepoBranchesError.value = githubApiErrorMessage(e, "Could not load branches from GitHub");
    } finally {
      if (reset) {
        githubRepoBranchesLoading.value = false;
      } else {
        githubRepoBranchesLoadingMore.value = false;
      }
    }
  }

  async function onGithubBranchPickerOpenChange(open: boolean): Promise<void> {
    githubBranchPickerOpen.value = open;
    if (!open) return;
    githubBranchSearch.value = "";
    await loadGithubRepoBranches(true);
  }

  async function loadMoreGithubRepoBranches(): Promise<void> {
    if (
      !githubRepoBranchesHasMore.value ||
      githubRepoBranchesLoading.value ||
      githubRepoBranchesLoadingMore.value
    ) {
      return;
    }
    githubRepoBranchesPage.value += 1;
    await loadGithubRepoBranches(false);
  }

  async function onBranchSelectedFromGithub(branchName: string): Promise<void> {
    const iss = params.issue.value;
    const repo = selectedGhRepo.value;
    if (!iss || !repo || !branchName.trim()) return;
    ghWorkflowBusy.value = true;
    ghWorkflowError.value = null;
    try {
      await issueApi.updateIssue(iss.id, {
        githubBranch: {
          branchName: branchName.trim(),
          owner: repo.owner,
          repoName: repo.name,
        },
      });
      await params.reloadIssue();
    } catch (e: unknown) {
      ghWorkflowError.value = githubApiErrorMessage(e, "Could not save selected branch");
    } finally {
      ghWorkflowBusy.value = false;
    }
  }

  async function selectGithubBranch(branchName: string): Promise<void> {
    githubBranchPickerOpen.value = false;
    await onBranchSelectedFromGithub(branchName);
  }

  async function createGithubBranchFromPicker(): Promise<void> {
    const iss = params.issue.value;
    if (!iss || !selectedGhRepo.value) return;

    const raw = githubBranchSearch.value.trim();
    headBranchLeaf.value = raw || suggestGithubBranchLeaf(iss.id, iss.title ?? "");
    githubBranchPickerOpen.value = false;

    const prereq = await resolveGithubWorkflowPrerequisites();
    if (prereq.kind !== "ready") {
      handleGithubWorkflowPrerequisiteFailure(prereq, iss.id, "create_branch");
      return;
    }
    await executeCreateGithubBranch(iss, prereq.repo, { prerequisitesResolved: true });
  }

  watch(
    () => params.issue.value?.id,
    () => {
      headBranchLeaf.value = "";
      selectedGhRepoId.value = null;
    },
  );

  watch(
    [() => params.issue.value, () => workspaceGhRepos.value],
    ([iss]) => {
      if (!iss) return;
      applyIssueGithubBranchToForm(iss);
    },
    { immediate: true, deep: true },
  );

  function pendingAutoResumeGateKey(): string {
    return [
      githubIntegrationStatus.value?.user?.githubLogin ?? "",
      String(workspaceGhRepos.value.length),
      String(route.query.github_oauth_success ?? ""),
    ].join("|");
  }

  watch(
    () => effectiveWorkspaceId.value,
    async (wid) => {
      githubIntegrationStatus.value = null;
      githubIntegrationStatusError.value = null;
      if (!wid) return;
      await refreshGithubIntegrationStatus();
    },
    { immediate: true },
  );

  const githubMemberAccountLinked = computed(() => githubIntegrationStatus.value?.user != null);

  const githubInstallationMissingOnGithub = computed(() => {
    return githubIntegrationStatus.value?.installationRemoteVerification === "missing_on_github";
  });

  const ghWorkflowReconnectSuggested = computed(() =>
    Boolean(
      ghWorkflowGithubErrorCode.value &&
        GITHUB_WORKFLOW_MEMBER_RECONNECT_CODES.has(ghWorkflowGithubErrorCode.value),
    ),
  );

  const githubPullRequestGroups = computed(() => {
    const filtered = githubPullRequests.value.filter((pr) => matchesGithubPrFilter(pr, prStatusFilter.value));
    const byRepo = new Map<string, IGithubIssuePullRequestLink[]>();
    for (const pr of filtered) {
      const key = pr.fullName;
      const list = byRepo.get(key);
      if (list) list.push(pr);
      else byRepo.set(key, [pr]);
    }
    return [...byRepo.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fullName, pullRequests]) => ({
        fullName,
        pullRequests: pullRequests.sort((x, y) => y.prNumber - x.prNumber),
      }));
  });

  async function refreshWorkspaceGhRepos(): Promise<void> {
    const wid = effectiveWorkspaceId.value;
    if (!wid) return;
    workspaceGhReposLoading.value = true;
    workspaceGhReposError.value = null;
    try {
      const page = await githubIntegrationApi.listRepositories(+wid, { page: 1, perPage: 100 });
      workspaceGhRepos.value = page.repositories;
    } catch (e: unknown) {
      workspaceGhRepos.value = [];
      workspaceGhReposError.value = githubApiErrorMessage(e, "Could not load repositories from GitHub");
    } finally {
      workspaceGhReposLoading.value = false;
    }
  }

  watch(
    () => effectiveWorkspaceId.value,
    async (wid) => {
      workspaceGhRepos.value = [];
      workspaceGhReposError.value = null;
      selectedGhRepoId.value = null;
      if (!wid) return;
      if (githubIntegrationStatus.value?.installation) {
        await refreshWorkspaceGhRepos();
      }
    },
  );

  watch(
    () => githubIntegrationStatus.value?.installation?.id,
    async (installationId) => {
      if (installationId == null) {
        workspaceGhRepos.value = [];
        return;
      }
      await refreshWorkspaceGhRepos();
    },
  );

  const selectedGhRepo = computed(
    () => workspaceGhRepos.value.find((r) => r.githubRepoId === selectedGhRepoId.value) ?? null,
  );

  watch(
    () => selectedGhRepo.value?.id,
    () => {
      githubRepoBranches.value = [];
      githubRepoBranchesHasMore.value = false;
      if (githubBranchPickerOpen.value) {
        loadGithubRepoBranches(true);
      }
    },
  );

  function resolveWorkflowRepo(): IGithubCatalogRepository | null {
    const selected = selectedGhRepo.value;
    if (selected) return selected;

    const iss = params.issue.value;
    const gb = iss?.githubBranch;
    if (gb?.owner && gb.repoName) {
      const inCatalog = workspaceGhRepos.value.find((r) => r.owner === gb.owner && r.name === gb.repoName);
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

    return workspaceGhRepos.value[0] ?? null;
  }

  async function refreshGithubIssuePullRequests(issueNumericId: number): Promise<void> {
    githubPullRequestsLoading.value = true;
    githubPullRequestsError.value = null;
    try {
      githubPullRequests.value = await githubIntegrationApi.listIssueGithubPullRequests(issueNumericId);
    } catch (e: unknown) {
      githubPullRequests.value = [];
      githubPullRequestsError.value = githubApiErrorMessage(e, "Could not load GitHub pull requests");
    } finally {
      githubPullRequestsLoading.value = false;
    }
  }

  watch(
    () => params.issue.value?.id,
    (id) => {
      if (id == null) {
        githubPullRequests.value = [];
        githubPullRequestsError.value = null;
        return;
      }
      refreshGithubIssuePullRequests(id);
    },
    { immediate: true },
  );

  function memberOAuthStartUrl(returnPath: string): string {
    const url = new URL(`${config.API_URL}/integrations/github/user/start`);
    url.searchParams.set("workspaceId", effectiveWorkspaceId.value);
    url.searchParams.set("redirect", returnPath);
    return url.toString();
  }

  async function refreshGithubIntegrationStatus(): Promise<boolean> {
    const wid = effectiveWorkspaceId.value;
    if (!wid) return false;
    githubIntegrationStatusLoading.value = true;
    githubIntegrationStatusError.value = null;
    try {
      githubIntegrationStatus.value = await githubIntegrationApi.getStatus(+wid);
      return true;
    } catch (e: unknown) {
      githubIntegrationStatus.value = null;
      githubIntegrationStatusError.value = githubApiErrorMessage(
        e,
        "Could not load GitHub integration status",
      );
      return false;
    } finally {
      githubIntegrationStatusLoading.value = false;
    }
  }

  function redirectToGithubIntegrations(): void {
    router.push({
      name: "github-integration-settings",
      params: { workspaceId: effectiveWorkspaceId.value },
    });
  }

  function redirectToMemberGithubLink(issueId: number): void {
    const returnPath = issueGithubReturnPath(effectiveWorkspaceId.value, effectiveProjectId.value, issueId);
    ghWorkflowStatusMessage.value = "Redirecting to link your GitHub account…";
    window.location.assign(memberOAuthStartUrl(returnPath));
  }

  function applyPendingFormState(pending: ReturnType<typeof readGithubIssueWorkflowPending>): void {
    if (!pending) return;
    headBranchLeaf.value = pending.headBranchLeaf;
    openPrAsDraft.value = pending.openPrAsDraft;
    if (
      pending.selectedRepoGithubId != null &&
      (workspaceGhRepos.value.some((r) => r.githubRepoId === pending.selectedRepoGithubId) ||
        pending.selectedRepoGithubId.includes("/"))
    ) {
      selectedGhRepoId.value = pending.selectedRepoGithubId;
    }
  }

  type ResolveGithubWorkflowPrerequisitesOptions = {
    /** When false, skip reloading the workspace catalogue (auto-resume). */
    refreshWorkspaceRepos?: boolean;
  };

  /** Fresh status + repo list before any branch/PR API call or resume. */
  async function resolveGithubWorkflowPrerequisites(
    options?: ResolveGithubWorkflowPrerequisitesOptions,
  ): Promise<GithubWorkflowPrerequisite> {
    const statusLoaded = await refreshGithubIntegrationStatus();
    if (!statusLoaded) {
      return { kind: "status_unavailable" };
    }

    const refreshWorkspaceRepos = options?.refreshWorkspaceRepos ?? true;
    if (refreshWorkspaceRepos && (workspaceGhReposLoading.value || !workspaceGhRepos.value.length)) {
      await refreshWorkspaceGhRepos();
    }

    if (githubInstallationMissingOnGithub.value) {
      return { kind: "installation_gone" };
    }

    const s = githubIntegrationStatus.value;
    if (!s?.installation) {
      return { kind: "workspace_install" };
    }

    if (!githubMemberAccountLinked.value) {
      return { kind: "member_link" };
    }

    const repo = resolveWorkflowRepo();
    if (!repo) {
      return { kind: "select_repo" };
    }

    return { kind: "ready", repo };
  }

  function handleGithubWorkflowPrerequisiteFailure(
    prereq: GithubWorkflowPrerequisite,
    issueId: number,
    action: GithubIssueWorkflowPendingAction,
  ): void {
    if (prereq.kind === "status_unavailable") {
      ghWorkflowError.value =
        githubIntegrationStatusError.value ?? "Could not load GitHub integration status. Try again.";
      return;
    }
    if (prereq.kind === "installation_gone") {
      ghWorkflowError.value =
        "GitHub no longer has this workspace installation. Ask an admin to reinstall the app.";
      return;
    }
    if (prereq.kind === "workspace_install") {
      if (canManageGithubSetup.value) {
        ghWorkflowError.value =
          "Install the GitHub App for this workspace before creating branches from issues.";
        redirectToGithubIntegrations();
      } else {
        ghWorkflowError.value =
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
    ghWorkflowError.value =
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
    ghWorkflowError.value = parsed.message;
    ghWorkflowGithubErrorCode.value = parsed.githubErrorCode;
  }

  type ExecuteGithubWorkflowOptions = {
    /** Caller already ran {@link resolveGithubWorkflowPrerequisites} (begin/resume). */
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
    ghWorkflowBusy.value = true;
    ghWorkflowStatusMessage.value = "Creating branch on GitHub…";
    ghWorkflowError.value = null;
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
      await params.reloadIssueActivityFeed();
    } catch (e: unknown) {
      const parsed = githubApiParseError(e, "Could not create branch");
      const existingBranch = parsed.message.match(/^Branch "([^"]+)" already exists/);
      if (existingBranch?.[1]) {
        headBranchLeaf.value = existingBranch[1];
        clearGithubIssueWorkflowPending();
        await issueApi.updateIssue(iss.id, {
          githubBranch: {
            branchName: existingBranch[1],
            owner: targetRepo.owner,
            repoName: targetRepo.name,
          },
        });
        await params.reloadIssue();
        ghWorkflowError.value = parsed.message;
        return;
      }
      handleGithubWorkflowApiError(e, "Could not create branch", iss.id, "create_branch");
    } finally {
      ghWorkflowBusy.value = false;
      ghWorkflowStatusMessage.value = null;
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
      ghWorkflowError.value = "Set a branch name (create a branch first, or paste the head branch).";
      return;
    }

    const ws = effectiveWorkspaceId.value;
    ghWorkflowBusy.value = true;
    ghWorkflowStatusMessage.value = "Opening pull request on GitHub…";
    ghWorkflowError.value = null;
    ghWorkflowGithubErrorCode.value = undefined;
    try {
      await githubIntegrationApi.createIssueGithubPull(+ws, iss.id, {
        owner: targetRepo.owner,
        name: targetRepo.name,
        headBranch: head,
        title: iss.title?.trim()?.length && iss.title ? iss.title : `Issue #${iss.id}`,
        draft: openPrAsDraft.value,
      });
      clearGithubIssueWorkflowPending();
      await refreshGithubIssuePullRequests(iss.id);
      await params.reloadIssueActivityFeed();
    } catch (e: unknown) {
      handleGithubWorkflowApiError(e, "Could not open pull request", iss.id, "open_pull");
    } finally {
      ghWorkflowBusy.value = false;
      ghWorkflowStatusMessage.value = null;
    }
  }

  async function tryResumePendingGithubWorkflow(): Promise<void> {
    const iss = params.issue.value;
    if (
      !iss ||
      ghWorkflowBusy.value ||
      workspaceGhReposLoading.value ||
      githubIntegrationStatusLoading.value
    ) {
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
      refreshWorkspaceRepos: workspaceGhRepos.value.length === 0,
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

  watch(
    () => ({
      issueId: params.issue.value?.id,
      dataReady: !workspaceGhReposLoading.value && !githubIntegrationStatusLoading.value,
      resumeGate: pendingAutoResumeGateKey(),
    }),
    ({ issueId, dataReady }) => {
      if (issueId == null || !dataReady) return;
      tryResumePendingGithubWorkflow();
    },
  );

  async function beginGithubWorkflow(action: GithubIssueWorkflowPendingAction): Promise<void> {
    const iss = params.issue.value;
    const wid = effectiveWorkspaceId.value;
    const pj = effectiveProjectId.value;
    if (!iss || !wid || !pj || ghWorkflowBusy.value || githubInstallationMissingOnGithub.value) {
      return;
    }

    saveGithubIssueWorkflowPending({
      workspaceId: wid,
      projectId: pj,
      issueId: iss.id,
      action,
      headBranchLeaf: headBranchLeaf.value,
      openPrAsDraft: openPrAsDraft.value,
      selectedGhRepoId: selectedGhRepoId.value,
    });

    ghWorkflowBusy.value = true;
    ghWorkflowStatusMessage.value = "Checking GitHub setup…";
    ghWorkflowError.value = null;
    ghWorkflowGithubErrorCode.value = undefined;

    let prereq: GithubWorkflowPrerequisite;
    try {
      prereq = await resolveGithubWorkflowPrerequisites();
    } finally {
      ghWorkflowBusy.value = false;
      if (ghWorkflowStatusMessage.value === "Checking GitHub setup…") {
        ghWorkflowStatusMessage.value = null;
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

  async function openGithubPull(): Promise<void> {
    if (githubNeedsRepoSelection.value) {
      openSelectGithubRepoDialog();
      return;
    }
    if (!headBranchLeaf.value.trim() && !activeGithubBranch.value?.branchName) {
      ghWorkflowError.value = "Select or create a branch before opening a pull request.";
      return;
    }
    if (!headBranchLeaf.value.trim() && activeGithubBranch.value?.branchName) {
      headBranchLeaf.value = activeGithubBranch.value.branchName;
    }
    await beginGithubWorkflow("open_pull");
  }

  return {
    githubPullRequests,
    githubPullRequestsLoading,
    githubPullRequestsError,
    workspaceGhRepos,
    workspaceGhReposLoading,
    workspaceGhReposError,
    selectedGhRepoId,
    selectedGhRepo,
    ghWorkflowBusy,
    ghWorkflowStatusMessage,
    ghWorkflowError,
    ghWorkflowReconnectSuggested,
    showGithubSection,
    canManageGithubSetup,
    githubWorkspaceEnabled,
    githubWorkflowFormVisible,
    githubNeedsRepoSelection,
    githubAdminNeedsWorkspaceInstall,
    githubMemberNeedsAccountLink,
    githubInstallationMissingOnGithub,
    githubIntegrationStatusError,
    selectGithubRepoDialogOpen,
    githubBranchPickerOpen,
    githubBranchSearch,
    githubRepoBranchesLoading,
    githubRepoBranchesError,
    githubRepoBranchesHasMore,
    filteredGithubRepoBranches,
    githubRepoBranchesLoadingMore,
    createBranchPickerDisabled,
    createBranchPickerLabel,
    githubBranchTriggerLabel,
    activeGithubBranch,
    headBranchLeaf,
    openPrAsDraft,
    prStatusFilter,
    githubPullRequestGroups,
    openSelectGithubRepoDialog,
    onGithubBranchPickerOpenChange,
    loadMoreGithubRepoBranches,
    selectGithubBranch,
    createGithubBranchFromPicker,
    onWorkspaceGithubRepoSelected,
    openGithubPull,
  };
}
