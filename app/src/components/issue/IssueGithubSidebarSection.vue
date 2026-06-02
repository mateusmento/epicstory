<script lang="ts" setup>
import type { IIssue, IGithubIssueBranchLink } from "@epicstory/contracts";
import { computed, ref, toRef, watch } from "vue";
import { RouterLink } from "vue-router";
import { Button } from "@/design-system";
import { useIssueGithubSidebar } from "@/domain/github";
import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi } from "@epicstory/api-client";
import { githubApiErrorMessage } from "@/domain/github";
import IssueCreateGithubBranchDialog from "./IssueCreateGithubBranchDialog.vue";

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
  // Keep existing PR workflow behavior by syncing its internal refs.
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

    // Refresh linked branches list so the new link appears immediately.
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
  <div v-if="showGithubSection" class="flex:col-sm border-t border-border pt-4">
    <div class="text-xs text-secondary-foreground">GitHub pull requests</div>
    <div v-if="githubPullRequestsLoading" class="text-xs text-muted-foreground">Loading…</div>
    <div v-else-if="githubPullRequestsError" class="text-xs text-red-600">
      {{ githubPullRequestsError }}
    </div>
    <div v-else-if="githubPullRequests.length === 0" class="text-xs text-muted-foreground">
      None synced yet (open a PR from a branch named
      <span class="font-mono">{{ issue.issueKey }}-…</span> on a linked repo).
    </div>
    <div v-else class="flex:col-sm min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <label class="text-xs text-secondary-foreground shrink-0" for="gh-pr-filter">Show</label>
        <select
          id="gh-pr-filter"
          v-model="prStatusFilter"
          class="rounded-md border border-input bg-background px-2 py-1 text-xs min-w-[8rem]"
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="merged">Merged</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <div v-if="githubPullRequestGroups.length === 0" class="text-xs text-muted-foreground">
        No pull requests match this filter.
      </div>
      <div v-else class="flex:col-md">
        <div v-for="group in githubPullRequestGroups" :key="group.fullName" class="flex:col-xs min-w-0">
          <div class="text-xs font-medium text-muted-foreground truncate" :title="group.fullName">
            {{ group.fullName }}
          </div>
          <ul class="flex:col-sm list-none min-w-0 m-0 pl-0">
            <li v-for="pr in group.pullRequests" :key="pr.githubPullRequestId" class="min-w-0">
              <a
                :href="pr.htmlUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-primary hover:underline min-w-0"
              >
                <span class="font-medium truncate">#{{ pr.prNumber }}</span>
                <span class="text-xs text-muted-foreground shrink-0">
                  {{ pr.merged ? "merged" : pr.state === "closed" ? "closed" : pr.draft ? "draft" : "open" }}
                </span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Branch / PR workflow -->
    <div class="flex:col-md mt-4 pt-3 border-t border-dashed border-border min-w-0">
      <div
        v-if="githubAdminNeedsWorkspaceInstall"
        class="rounded-md border border-border bg-muted/30 px-2 py-2 text-xs text-secondary-foreground"
      >
        Enable GitHub for this workspace before creating branches from issues.
        <RouterLink :to="githubSettingsRoute" class="block mt-1 font-medium text-primary underline">
          Integrations → GitHub → Install app
        </RouterLink>
      </div>

      <div
        v-else-if="githubMemberNeedsAccountLink"
        class="rounded-md border border-amber-600/30 bg-amber-500/10 px-2 py-2 text-xs text-amber-950 dark:text-amber-100"
      >
        Link your GitHub account for this workspace to create branches and pull requests from issues.
        <RouterLink :to="githubSettingsRoute" class="block mt-1 font-medium text-primary underline">
          Integrations → GitHub → Link account
        </RouterLink>
      </div>

      <template v-else-if="githubWorkflowFormVisible">
        <div class="flex:col-sm min-w-0">
          <div class="flex items-center justify-between gap-2">
            <label class="text-xs text-secondary-foreground block">Linked branches</label>
            <Button
              variant="outline"
              size="sm"
              type="button"
              :disabled="ghWorkflowBusy"
              @click="createBranchDialogOpen = true"
            >
              Create branch…
            </Button>
          </div>
          <div v-if="linkedBranchesError" class="text-xs text-red-600">{{ linkedBranchesError }}</div>
          <div v-else-if="linkedBranchesLoading" class="text-xs text-muted-foreground">
            Loading linked branches…
          </div>
          <div v-else-if="linkedBranches.length === 0" class="text-xs text-muted-foreground">
            No linked branches yet. Create one, or push a branch whose name/commit message contains the issue
            key.
          </div>
          <ul v-else class="flex flex-col gap-1 m-0 p-0 list-none">
            <li v-for="b in linkedBranches" :key="b.id" class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 min-w-0 cursor-pointer">
                <input
                  type="radio"
                  name="gh-linked-branch"
                  class="rounded border-input"
                  :value="b.id"
                  v-model="selectedLinkedBranchId"
                />
                <span class="min-w-0">
                  <span class="text-xs text-muted-foreground truncate block">{{ b.fullName }}</span>
                  <span class="text-sm font-mono truncate block">{{ b.branchName }}</span>
                </span>
              </label>
              <a
                :href="b.htmlUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-primary hover:underline shrink-0"
              >
                View
              </a>
            </li>
          </ul>
        </div>

        <label class="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
          <input v-model="openPrAsDraft" type="checkbox" class="rounded border-input" />
          Draft pull request
        </label>

        <div
          v-if="githubInstallationMissingOnGithub"
          class="rounded-md border border-destructive/35 bg-destructive/10 px-2 py-2 text-xs text-destructive"
        >
          GitHub reports this workspace installation is gone. Ask a workspace admin to reinstall the app.
          <RouterLink :to="githubSettingsRoute" class="block mt-1 font-medium underline">
            Integrations → GitHub
          </RouterLink>
        </div>
        <div
          v-else-if="ghWorkflowReconnectSuggested && !githubInstallationMissingOnGithub"
          class="rounded-md border border-amber-600/30 bg-amber-500/10 px-2 py-2 text-xs text-amber-950 dark:text-amber-100"
        >
          {{ ghWorkflowError }}
          <RouterLink :to="githubSettingsRoute" class="block mt-1 font-medium text-primary underline">
            Link your GitHub account →
          </RouterLink>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button
            size="sm"
            type="button"
            :disabled="
              ghWorkflowBusy || githubInstallationMissingOnGithub || !selectedLinkedBranch?.branchName
            "
            @click="
              selectedLinkedBranch
                ? openGithubPull({
                    owner: selectedLinkedBranch.owner,
                    repoName: selectedLinkedBranch.repoName,
                    branchName: selectedLinkedBranch.branchName,
                  })
                : undefined
            "
          >
            Open pull request
          </Button>
        </div>
      </template>

      <div v-if="ghWorkflowBusy && ghWorkflowStatusMessage" class="text-xs text-muted-foreground">
        {{ ghWorkflowStatusMessage }}
      </div>
      <div
        v-else-if="
          ghWorkflowError &&
          githubWorkflowFormVisible &&
          !(ghWorkflowReconnectSuggested && !githubInstallationMissingOnGithub)
        "
        class="text-xs text-red-600"
      >
        {{ ghWorkflowError }}
      </div>
    </div>

    <IssueCreateGithubBranchDialog
      v-model:open="createBranchDialogOpen"
      :workspace-id="workspaceId"
      :selected-repo-github-id="selectedGhRepoId"
      :initial-branch-name="headBranchLeaf"
      :busy="ghWorkflowBusy"
      :error="createBranchDialogError ?? ghWorkflowError"
      @create="createBranchFromDialog"
    />
  </div>
</template>
