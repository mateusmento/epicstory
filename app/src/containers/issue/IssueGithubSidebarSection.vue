<script lang="ts" setup>
import { useIssueGithubSidebar } from "@/domain/github";
import IssueCreateGithubBranchDialog from "@/presentationals/issue/IssueCreateGithubBranchDialog.vue";
import IssueGithubPullRequestsList from "@/presentationals/issue/IssueGithubPullRequestsList.vue";
import IssueGithubSidebar from "@/presentationals/issue/IssueGithubSidebar.vue";
import IssueGithubWorkflowPanel from "@/presentationals/issue/IssueGithubWorkflowPanel.vue";
import type { IGithubCatalogRepository, IIssue } from "@epicstory/contracts";
import { computed, ref, watch } from "vue";
import IssueSelectGithubRepoDialog from "./IssueSelectGithubRepoDialog.vue";

const props = defineProps<{
  issue: IIssue;
  reloadIssueActivityFeed: () => Promise<void>;
  reloadIssue: () => Promise<void>;
}>();

const { integration, pullRequests, linkedBranches, workflow } = useIssueGithubSidebar({
  issue: computed(() => props.issue),
  reloadIssueActivityFeed: () => props.reloadIssueActivityFeed(),
  reloadIssue: () => props.reloadIssue(),
});

const repoPickerOpen = ref(false);
const selectedRepoForCreate = ref<IGithubCatalogRepository | null>(null);

watch(
  () => linkedBranches.createBranchDialogOpen,
  (isOpen) => {
    if (!isOpen) {
      selectedRepoForCreate.value = null;
    }
  },
);
</script>

<template>
  <IssueGithubSidebar :show-github-section="integration.showGithubSection">
    <template #pull-requests>
      <IssueGithubPullRequestsList
        :issue="issue"
        :pr="pullRequests.prView"
        v-model:pr-status-filter="pullRequests.prStatusFilter"
      />
    </template>

    <template #workflow>
      <IssueGithubWorkflowPanel
        :access="integration.access"
        :form-visible="integration.workflowFormVisible"
        :linked-branches="linkedBranches.linkedBranches"
        :mutation="workflow.workflowMutationView"
        :selected-linked-branch="linkedBranches.selectedLinkedBranch"
        v-model:selected-linked-branch-id="linkedBranches.selectedLinkedBranchId"
        v-model:open-pr-as-draft="workflow.openPrAsDraft"
        v-model:create-branch-dialog-open="linkedBranches.createBranchDialogOpen"
        @open-github-pull="workflow.openGithubPull"
      />
    </template>

    <template #create-branch-dialog>
      <IssueCreateGithubBranchDialog
        v-model:open="linkedBranches.createBranchDialogOpen"
        :selected-repo="selectedRepoForCreate"
        :initial-branch-name="workflow.headBranchLeaf"
        :busy="workflow.workflowMutationView.busy"
        :error="linkedBranches.createBranchDialogError ?? workflow.workflowMutationView.error"
        @open-repo-picker="repoPickerOpen = true"
        @create="linkedBranches.createBranchFromDialog"
      />
      <IssueSelectGithubRepoDialog
        v-model:open="repoPickerOpen"
        :workspace-id="issue.workspaceId"
        :selected-repo-github-id="workflow.selectedGhRepoId"
        @selected="selectedRepoForCreate = $event"
      />
    </template>
  </IssueGithubSidebar>
</template>
