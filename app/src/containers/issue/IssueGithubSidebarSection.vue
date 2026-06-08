<script lang="ts" setup>
import type { IGithubCatalogRepository, IIssue } from "@epicstory/contracts";
import IssueCreateGithubBranchDialog from "@/presentationals/issue/IssueCreateGithubBranchDialog.vue";
import IssueGithubSidebarView from "@/presentationals/issue/IssueGithubSidebar.vue";
import IssueSelectGithubRepoDialog from "./IssueSelectGithubRepoDialog.vue";
import { computed, ref, toRef, watch } from "vue";
import { useIssueGithubSidebar } from "@/domain/github";

const props = defineProps<{
  workspaceId: string;
  projectId: string;
  issue: IIssue;
  reloadIssueActivityFeed: () => Promise<void>;
  reloadIssue: () => Promise<void>;
}>();

const sidebar = useIssueGithubSidebar({
  workspaceId: toRef(props, "workspaceId"),
  projectId: toRef(props, "projectId"),
  issue: computed(() => props.issue),
  reloadIssueActivityFeed: () => props.reloadIssueActivityFeed(),
  reloadIssue: () => props.reloadIssue(),
});

const repoPickerOpen = ref(false);
const selectedRepoForCreate = ref<IGithubCatalogRepository | null>(null);

watch(
  () => sidebar.createBranchDialogOpen,
  (isOpen) => {
    if (!isOpen) {
      selectedRepoForCreate.value = null;
    }
  },
);
</script>

<template>
  <IssueGithubSidebarView
    :issue="issue"
    :show-github-section="sidebar.showGithubSection"
    :pr="sidebar.prView"
    :access="sidebar.access"
    :workflow="sidebar.workflowView"
    v-model:pr-status-filter="sidebar.prStatusFilter"
    v-model:selected-linked-branch-id="sidebar.selectedLinkedBranchId"
    v-model:open-pr-as-draft="sidebar.openPrAsDraft"
    v-model:create-branch-dialog-open="sidebar.createBranchDialogOpen"
    @open-github-pull="sidebar.openGithubPull"
    @create-branch="sidebar.createBranchFromDialog"
  >
    <template #create-branch-dialog>
      <IssueCreateGithubBranchDialog
        v-model:open="sidebar.createBranchDialogOpen"
        :selected-repo="selectedRepoForCreate"
        :initial-branch-name="sidebar.headBranchLeaf"
        :busy="sidebar.workflowView.mutation.busy"
        :error="sidebar.workflowView.mutation.createBranchDialogError ?? sidebar.workflowView.mutation.error"
        @open-repo-picker="repoPickerOpen = true"
        @create="sidebar.createBranchFromDialog"
      />
      <IssueSelectGithubRepoDialog
        v-model:open="repoPickerOpen"
        :workspace-id="workspaceId"
        :selected-repo-github-id="sidebar.selectedGhRepoId"
        @selected="selectedRepoForCreate = $event"
      />
    </template>
  </IssueGithubSidebarView>
</template>
