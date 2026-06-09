import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi } from "@epicstory/api-client";
import type { IGithubIssuePullRequestLink } from "@epicstory/contracts";
import { toAsyncDataView } from "@/lib/async";
import { groupGithubPullRequests, type GithubPrStatusFilter } from "@/lib/github";
import type { Ref } from "vue";
import { computed, markRaw, reactive, ref } from "vue";
import { githubApiErrorMessage } from "../github-api-errors";

export type { GithubPrStatusFilter };

export function useIssueGithubPullRequests(_issueId: Ref<number | undefined>) {
  const githubIntegrationApi = useDependency(GithubIntegrationApi);

  const pr = reactive({
    data: null as IGithubIssuePullRequestLink[] | null,
    loading: false,
    error: null as string | null,
  });

  const prStatusFilter = ref<GithubPrStatusFilter>("all");

  const prGroups = computed(() => groupGithubPullRequests(pr.data ?? [], prStatusFilter.value));

  const prView = computed(() => ({
    ...toAsyncDataView(pr),
    groups: prGroups.value,
  }));

  async function reload(issueNumericId: number): Promise<void> {
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

  function clear(): void {
    pr.data = [];
    pr.error = null;
  }

  return reactive({
    prStatusFilter,
    prView,
    reload: markRaw(reload),
    clear: markRaw(clear),
  });
}

export type IssueGithubPullRequests = ReturnType<typeof useIssueGithubPullRequests>;
