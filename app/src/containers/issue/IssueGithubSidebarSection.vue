<script lang="ts" setup>
import type { IGithubIssueBranchLink, IIssue } from "@epicstory/contracts";
import IssueGithubSidebarView from "@/presentationals/issue/IssueGithubSidebar.vue";
import { computed, ref, toRef, watch } from "vue";
import { useIssueGithubSidebar } from "@/domain/github";
import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi } from "@epicstory/api-client";
import { githubApiErrorMessage } from "@/domain/github";

const props = defineProps<{
  workspaceId: string;
  projectId: string;
  issue: IIssue;
  reloadIssueActivityFeed: () => Promise<void>;
  reloadIssue: () => Promise<void>;
}>();

const githubSettingsRoute = computed(() => ({
  name: "github-integration-settings" as const,
  params: { workspaceId: props.workspaceId },
}));

const {
  githubPullRequests,
  githubPullRequestsLoading,
  githubPullRequestsError,
  selectedGhRepoId,
  ghWorkflowBusy,
  ghWorkflowStatusMessage,
  ghWorkflowError,
  openPrAsDraft,
  prStatusFilter,
  githubPullRequestGroups,
  showGithubSection,
  githubWorkflowFormVisible,
  githubAdminNeedsWorkspaceInstall,
  githubMemberNeedsAccountLink,
  githubInstallationMissingOnGithub,
  ghWorkflowReconnectSuggested,
  openGithubPull,
  headBranchLeaf,
} = useIssueGithubSidebar({
  workspaceId: toRef(props, "workspaceId"),
  projectId: toRef(props, "projectId"),
  issue: computed(() => props.issue),
  reloadIssueActivityFeed: () => props.reloadIssueActivityFeed(),
  reloadIssue: () => props.reloadIssue(),
});

const githubIntegrationApi = useDependency(GithubIntegrationApi);

const linkedBranches = ref<IGithubIssueBranchLink[]>([]);
const linkedBranchesLoading = ref(false);
const linkedBranchesError = ref<string | null>(null);
const selectedLinkedBranchId = ref<number | null>(null);
const createBranchDialogOpen = ref(false);
const createBranchDialogError = ref<string | null>(null);

const selectedLinkedBranch = computed(() => {
  const id = selectedLinkedBranchId.value;
  if (id == null) return linkedBranches.value[0] ?? null;
  return linkedBranches.value.find((b) => b.id === id) ?? linkedBranches.value[0] ?? null;
});

async function refreshLinkedBranches(): Promise<void> {
  linkedBranchesLoading.value = true;
  linkedBranchesError.value = null;
  try {
    linkedBranches.value = await githubIntegrationApi.listIssueGithubBranches(props.issue.id);
    if (selectedLinkedBranchId.value == null && linkedBranches.value.length > 0) {
      selectedLinkedBranchId.value = linkedBranches.value[0].id;
    }
  } catch (e) {
    linkedBranches.value = [];
    linkedBranchesError.value = githubApiErrorMessage(e, "Could not load linked branches.");
  } finally {
    linkedBranchesLoading.value = false;
  }
}

function applySelectedBranchToWorkflow(): void {
  const b = selectedLinkedBranch.value;
  if (!b) return;
  headBranchLeaf.value = b.branchName;
  selectedGhRepoId.value = `${b.owner}/${b.repoName}`;
}

async function createBranchFromDialog(payload: {
  repo: { owner: string; name: string; githubRepoId: string };
  branchName: string;
}): Promise<void> {
  createBranchDialogError.value = null;
  try {
    await githubIntegrationApi.createIssueGithubBranch(+props.workspaceId, props.issue.id, {
      owner: payload.repo.owner,
      name: payload.repo.name,
      branchName: payload.branchName,
    });

    await refreshLinkedBranches();
    const newlyLinked =
      linkedBranches.value.find(
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
    await props.reloadIssueActivityFeed();
  } catch (e: unknown) {
    createBranchDialogError.value = githubApiErrorMessage(e, "Could not create branch on GitHub");
  }
}

watch(
  () => props.issue.id,
  async () => {
    selectedLinkedBranchId.value = null;
    createBranchDialogError.value = null;
    await refreshLinkedBranches();
    applySelectedBranchToWorkflow();
  },
  { immediate: true },
);

watch(
  () => selectedLinkedBranch.value?.id,
  () => applySelectedBranchToWorkflow(),
);
</script>

<template>
  <IssueGithubSidebarView
    :issue="issue"
    :workspace-id="workspaceId"
    :show-github-section="showGithubSection"
    :github-pull-requests-loading="githubPullRequestsLoading"
    :github-pull-requests-error="githubPullRequestsError"
    :github-pull-requests-count="githubPullRequests.length"
    :github-pull-request-groups="githubPullRequestGroups"
    :github-settings-route="githubSettingsRoute"
    :github-admin-needs-workspace-install="githubAdminNeedsWorkspaceInstall"
    :github-member-needs-account-link="githubMemberNeedsAccountLink"
    :github-workflow-form-visible="githubWorkflowFormVisible"
    :linked-branches="linkedBranches"
    :linked-branches-loading="linkedBranchesLoading"
    :linked-branches-error="linkedBranchesError"
    :selected-linked-branch="selectedLinkedBranch"
    :gh-workflow-busy="ghWorkflowBusy"
    :github-installation-missing-on-github="githubInstallationMissingOnGithub"
    :gh-workflow-reconnect-suggested="ghWorkflowReconnectSuggested"
    :gh-workflow-error="ghWorkflowError"
    :gh-workflow-status-message="ghWorkflowStatusMessage"
    :selected-gh-repo-id="selectedGhRepoId"
    :head-branch-leaf="headBranchLeaf"
    :create-branch-dialog-error="createBranchDialogError"
    v-model:pr-status-filter="prStatusFilter"
    v-model:selected-linked-branch-id="selectedLinkedBranchId"
    v-model:open-pr-as-draft="openPrAsDraft"
    v-model:create-branch-dialog-open="createBranchDialogOpen"
    @open-github-pull="openGithubPull"
    @create-branch="createBranchFromDialog"
  />
</template>
