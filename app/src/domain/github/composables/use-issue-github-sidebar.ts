import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi } from "@epicstory/api-client";
import type { IGithubIssuePullRequestLink, IGithubProjectRepoLink, IIssue } from "@epicstory/contracts";
import type { ComputedRef, Ref } from "vue";
import { computed, ref, watch } from "vue";
import { githubApiErrorMessage } from "../github-api-errors";

export type GithubPrStatusFilter = "all" | "open" | "merged" | "closed";

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
};

export type UseIssueGithubSidebarReturn = {
  githubPullRequests: Ref<IGithubIssuePullRequestLink[]>;
  githubPullRequestsLoading: Ref<boolean>;
  githubPullRequestsError: Ref<string | null>;

  linkedGhRepos: Ref<IGithubProjectRepoLink[]>;
  linkedGhReposLoading: Ref<boolean>;
  linkedGhReposError: Ref<string | null>;

  selectedGhLinkId: Ref<number | null>;
  selectedGhRepo: ComputedRef<IGithubProjectRepoLink | null>;

  ghWorkflowBusy: Ref<boolean>;
  ghWorkflowError: Ref<string | null>;
  headBranchLeaf: Ref<string>;
  openPrAsDraft: Ref<boolean>;

  prStatusFilter: Ref<GithubPrStatusFilter>;
  githubPullRequestGroups: ComputedRef<{ fullName: string; pullRequests: IGithubIssuePullRequestLink[] }[]>;

  createGithubBranch: () => Promise<void>;
  openGithubPull: () => Promise<void>;
};

export function useIssueGithubSidebar(params: UseIssueGithubSidebarParams): UseIssueGithubSidebarReturn {
  const githubIntegrationApi = useDependency(GithubIntegrationApi);

  const githubPullRequests = ref<IGithubIssuePullRequestLink[]>([]);
  const githubPullRequestsLoading = ref(false);
  const githubPullRequestsError = ref<string | null>(null);

  const linkedGhRepos = ref<IGithubProjectRepoLink[]>([]);
  const linkedGhReposLoading = ref(false);
  const linkedGhReposError = ref<string | null>(null);
  const selectedGhLinkId = ref<number | null>(null);

  const ghWorkflowBusy = ref(false);
  const ghWorkflowError = ref<string | null>(null);
  const headBranchLeaf = ref("");
  const openPrAsDraft = ref(false);
  const prStatusFilter = ref<GithubPrStatusFilter>("all");

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

  watch(
    () => linkedGhRepos.value,
    (repos) => {
      if (!repos.length) {
        selectedGhLinkId.value = null;
        return;
      }
      if (selectedGhLinkId.value == null || !repos.some((r) => r.id === selectedGhLinkId.value)) {
        const primary = repos.find((r) => r.isPrimary);
        selectedGhLinkId.value = primary?.id ?? repos[0]?.id ?? null;
      }
    },
    { deep: true },
  );

  watch(
    () => [params.workspaceId.value, params.projectId.value] as const,
    async ([wid, pj]) => {
      linkedGhRepos.value = [];
      linkedGhReposError.value = null;
      if (!wid || !pj) return;
      linkedGhReposLoading.value = true;
      try {
        linkedGhRepos.value = await githubIntegrationApi.listProjectGithubRepos(+wid, +pj);
      } catch (e: unknown) {
        linkedGhRepos.value = [];
        linkedGhReposError.value = githubApiErrorMessage(e, "Could not load linked GitHub repos");
      } finally {
        linkedGhReposLoading.value = false;
      }
    },
    { immediate: true },
  );

  const selectedGhRepo = computed(
    () => linkedGhRepos.value.find((r) => r.id === selectedGhLinkId.value) ?? null,
  );

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

  async function createGithubBranch(): Promise<void> {
    const iss = params.issue.value;
    const ws = params.workspaceId.value;
    const repo = selectedGhRepo.value;
    if (!iss || !repo || ghWorkflowBusy.value) return;
    ghWorkflowBusy.value = true;
    ghWorkflowError.value = null;
    try {
      const res = await githubIntegrationApi.createIssueGithubBranch(+ws, iss.id, {
        owner: repo.owner,
        name: repo.name,
      });
      headBranchLeaf.value = res.branchName;
      await refreshGithubIssuePullRequests(iss.id);
      await params.reloadIssueActivityFeed();
    } catch (e: unknown) {
      ghWorkflowError.value = githubApiErrorMessage(e, "Could not create branch");
    } finally {
      ghWorkflowBusy.value = false;
    }
  }

  async function openGithubPull(): Promise<void> {
    const iss = params.issue.value;
    const ws = params.workspaceId.value;
    const repo = selectedGhRepo.value;
    if (!iss || !repo || ghWorkflowBusy.value) return;
    const head = headBranchLeaf.value.trim();
    if (!head) {
      ghWorkflowError.value = "Set a branch name (create a branch first, or paste the head branch).";
      return;
    }
    ghWorkflowBusy.value = true;
    ghWorkflowError.value = null;
    try {
      await githubIntegrationApi.createIssueGithubPull(+ws, iss.id, {
        owner: repo.owner,
        name: repo.name,
        headBranch: head,
        title: iss.title?.trim()?.length && iss.title ? iss.title : `Issue #${iss.id}`,
        draft: openPrAsDraft.value,
      });
      await refreshGithubIssuePullRequests(iss.id);
      await params.reloadIssueActivityFeed();
    } catch (e: unknown) {
      ghWorkflowError.value = githubApiErrorMessage(e, "Could not open pull request");
    } finally {
      ghWorkflowBusy.value = false;
    }
  }

  return {
    githubPullRequests,
    githubPullRequestsLoading,
    githubPullRequestsError,
    linkedGhRepos,
    linkedGhReposLoading,
    linkedGhReposError,
    selectedGhLinkId,
    selectedGhRepo,
    ghWorkflowBusy,
    ghWorkflowError,
    headBranchLeaf,
    openPrAsDraft,
    prStatusFilter,
    githubPullRequestGroups,
    createGithubBranch,
    openGithubPull,
  };
}
