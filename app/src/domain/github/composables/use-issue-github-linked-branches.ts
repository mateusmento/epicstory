import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi } from "@epicstory/api-client";
import type { IGithubIssueBranchLink } from "@epicstory/contracts";
import type { Ref } from "vue";
import { computed, markRaw, reactive, ref } from "vue";
import { githubApiErrorMessage } from "../github-api-errors";

export type UseIssueGithubLinkedBranchesParams = {
  workspaceId: Ref<string>;
  issueId: Ref<number | undefined>;
  reloadIssueActivityFeed: () => Promise<void>;
  onBranchApplied: () => void;
};

export function useIssueGithubLinkedBranches(params: UseIssueGithubLinkedBranchesParams) {
  const githubIntegrationApi = useDependency(GithubIntegrationApi);

  const linkedBranches = reactive({
    data: null as IGithubIssueBranchLink[] | null,
    loading: false,
    error: null as string | null,
  });

  const selectedLinkedBranchId = ref<number | null>(null);
  const createBranchDialogOpen = ref(false);
  const createBranchDialogError = ref<string | null>(null);

  const selectedLinkedBranch = computed(() => {
    const items = linkedBranches.data ?? [];
    const id = selectedLinkedBranchId.value;
    if (id == null) return items[0] ?? null;
    return items.find((b) => b.id === id) ?? items[0] ?? null;
  });

  async function refresh(issueId: number): Promise<void> {
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

  async function createBranchFromDialog(payload: {
    repo: { owner: string; name: string; githubRepoId: string };
    branchName: string;
  }): Promise<void> {
    const issueId = params.issueId.value;
    if (issueId == null) return;

    createBranchDialogError.value = null;
    try {
      await githubIntegrationApi.createIssueGithubBranch(+params.workspaceId.value, issueId, {
        owner: payload.repo.owner,
        name: payload.repo.name,
        branchName: payload.branchName,
      });

      await refresh(issueId);
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
      params.onBranchApplied();
      createBranchDialogOpen.value = false;
      await params.reloadIssueActivityFeed();
    } catch (e: unknown) {
      createBranchDialogError.value = githubApiErrorMessage(e, "Could not create branch on GitHub");
    }
  }

  function clear(): void {
    linkedBranches.data = [];
    linkedBranches.error = null;
  }

  function clearDialogError(): void {
    createBranchDialogError.value = null;
  }

  function resetSelection(): void {
    selectedLinkedBranchId.value = null;
  }

  return reactive({
    linkedBranches,
    selectedLinkedBranchId,
    selectedLinkedBranch,
    createBranchDialogOpen,
    createBranchDialogError,
    refresh: markRaw(refresh),
    createBranchFromDialog: markRaw(createBranchFromDialog),
    clear: markRaw(clear),
    clearDialogError: markRaw(clearDialogError),
    resetSelection: markRaw(resetSelection),
  });
}

export type IssueGithubLinkedBranches = ReturnType<typeof useIssueGithubLinkedBranches>;
