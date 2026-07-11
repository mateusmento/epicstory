<script lang="ts" setup>
import { useIssueGithubSidebar } from "@/domain/github";
import { countIssueDevelopmentItems, groupIssueDevelopmentItems } from "@/lib/github";
import IssueCreateGithubBranchDialog from "@/presentationals/issue/IssueCreateGithubBranchDialog.vue";
import IssueGithubDevelopmentList from "@/presentationals/issue/IssueGithubDevelopmentList.vue";
import IssueGithubDevelopmentSection from "@/presentationals/issue/IssueGithubDevelopmentSection.vue";
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

const developmentGroups = computed(() =>
  groupIssueDevelopmentItems(
    linkedBranches.linkedBranches.data ?? [],
    pullRequests.prView.data ?? [],
    pullRequests.prStatusFilter,
  ),
);

const itemCount = computed(() => countIssueDevelopmentItems(developmentGroups.value));

const openPrCount = computed(
  () => (pullRequests.prView.data ?? []).filter((p) => !p.merged && p.state !== "closed").length,
);

const branchCount = computed(() => linkedBranches.linkedBranches.data?.length ?? 0);

const setupBlocked = computed(
  () => integration.access.adminNeedsWorkspaceInstall || integration.access.memberNeedsAccountLink,
);

const defaultOpen = computed(() => {
  if (workflow.workflowMutationView.busy) return true;
  if (setupBlocked.value) return true;
  return itemCount.value > 0 || openPrCount.value > 0 || branchCount.value > 0;
});

async function onOpenPull(payload: { owner: string; repoName: string; branchName: string; draft: boolean }) {
  workflow.openPrAsDraft = payload.draft;
  await workflow.openGithubPull({
    owner: payload.owner,
    repoName: payload.repoName,
    branchName: payload.branchName,
  });
}
</script>

<template>
  <IssueGithubDevelopmentSection
    :show-github-section="integration.showGithubSection"
    :status-ready="integration.statusReady"
    :item-count="itemCount"
    :default-open="defaultOpen"
    :can-create-branch="integration.workflowFormVisible"
    :setup-blocked="setupBlocked"
    :create-branch-disabled="workflow.workflowMutationView.busy"
    @create-branch="linkedBranches.createBranchDialogOpen = true"
  >
    <template #banners>
      <IssueGithubWorkflowPanel
        :access="integration.access"
        :form-visible="integration.workflowFormVisible"
        :mutation="workflow.workflowMutationView"
      />
    </template>

    <template #list>
      <IssueGithubDevelopmentList
        v-if="!setupBlocked"
        :groups="developmentGroups"
        :branches="linkedBranches.linkedBranches"
        :pull-requests="pullRequests.prView"
        :mutation-busy="workflow.workflowMutationView.busy"
        :can-open-pull="integration.workflowFormVisible"
        :issue-key-hint="issue.issueKey"
        v-model:pr-status-filter="pullRequests.prStatusFilter"
        @open-pull="onOpenPull"
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
  </IssueGithubDevelopmentSection>
</template>
