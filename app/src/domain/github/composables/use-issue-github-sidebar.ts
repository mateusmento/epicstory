import type { IIssue } from "@epicstory/contracts";
import type { Ref } from "vue";
import { computed, unref, watch } from "vue";
import { useGithubIntegrationContext } from "./use-github-integration-context";
import { useIssueGithubLinkedBranches } from "./use-issue-github-linked-branches";
import { useIssueGithubPullRequests } from "./use-issue-github-pull-requests";
import { useIssueGithubWorkflow } from "./use-issue-github-workflow";

export type { GithubPrStatusFilter } from "./use-issue-github-pull-requests";

export type UseIssueGithubSidebarParams = {
  issue: Ref<IIssue>;
  reloadIssueActivityFeed: () => Promise<void>;
  reloadIssue: () => Promise<void>;
};

export function useIssueGithubSidebar(params: UseIssueGithubSidebarParams) {
  const workspaceId = computed(() => String(params.issue.value.workspaceId));
  const issueId = computed(() => params.issue.value.id);

  const integration = useGithubIntegrationContext(workspaceId);
  const pullRequests = useIssueGithubPullRequests(issueId);

  const linkedBranches = useIssueGithubLinkedBranches({
    workspaceId,
    issueId,
    reloadIssueActivityFeed: params.reloadIssueActivityFeed,
    onBranchApplied: () => workflow?.applyLinkedBranch(unref(linkedBranches!.selectedLinkedBranch)),
  });

  const workflow = useIssueGithubWorkflow({
    issue: params.issue,
    integration,
    reloadPullRequests: (id) => pullRequests.reload(id),
    refreshLinkedBranches: (id) => linkedBranches!.refresh(id),
    reloadIssue: params.reloadIssue,
    reloadIssueActivityFeed: params.reloadIssueActivityFeed,
  });

  watch(
    issueId,
    (id) => {
      workflow.resetFormState();
      linkedBranches.resetSelection();
      linkedBranches.clearDialogError();
      if (id == null) {
        pullRequests.clear();
        linkedBranches.clear();
        return;
      }
      pullRequests.reload(id);
      linkedBranches.refresh(id).then(() => {
        workflow.applyLinkedBranch(unref(linkedBranches.selectedLinkedBranch));
      });
    },
    { immediate: true },
  );

  watch(
    [() => params.issue.value, () => integration.catalog.items],
    ([iss]) => {
      if (!iss) return;
      workflow.applyIssueGithubBranchToForm(iss);
    },
    { immediate: true, deep: true },
  );

  watch(
    () => unref(linkedBranches.selectedLinkedBranch)?.id,
    () => workflow.applyLinkedBranch(unref(linkedBranches.selectedLinkedBranch)),
  );

  watch(workspaceId, () => {
    workflow.resetFormState();
  });

  return {
    integration,
    pullRequests,
    linkedBranches,
    workflow,
  };
}
