<script lang="ts" setup>
import type { IIssue } from "@epicstory/contracts";
import { computed, toRef } from "vue";
import { RouterLink } from "vue-router";
import { Button } from "@/design-system";
import { useIssueGithubSidebar } from "@/domain/github";
import IssueGithubBranchCombobox from "./IssueGithubBranchCombobox.vue";
import IssueLinkGithubRepoDialog from "./IssueLinkGithubRepoDialog.vue";

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
  linkedGhRepos,
  linkedGhReposLoading,
  linkedGhReposError,
  selectedGhLinkId,
  ghWorkflowBusy,
  ghWorkflowStatusMessage,
  ghWorkflowError,
  openPrAsDraft,
  prStatusFilter,
  githubPullRequestGroups,
  showGithubSection,
  canManageGithubSetup,
  githubWorkflowFormVisible,
  githubAdminNeedsProjectRepo,
  githubCollaboratorAwaitingProjectRepo,
  githubAdminNeedsWorkspaceInstall,
  githubMemberNeedsAccountLink,
  githubInstallationMissingOnGithub,
  ghWorkflowReconnectSuggested,
  linkProjectRepoDialogOpen,
  githubBranchPickerOpen,
  githubBranchSearch,
  githubRepoBranchesLoading,
  githubRepoBranchesLoadingMore,
  githubRepoBranchesError,
  filteredGithubRepoBranches,
  createBranchPickerDisabled,
  createBranchPickerLabel,
  githubBranchTriggerLabel,
  activeGithubBranch,
  selectedGhRepo,
  openLinkProjectRepoDialog,
  onGithubBranchPickerOpenChange,
  loadMoreGithubRepoBranches,
  selectGithubBranch,
  createGithubBranchFromPicker,
  onProjectGithubRepoLinked,
  openGithubPull,
} = useIssueGithubSidebar({
  workspaceId: toRef(props, "workspaceId"),
  projectId: toRef(props, "projectId"),
  issue: computed(() => props.issue),
  reloadIssueActivityFeed: () => props.reloadIssueActivityFeed(),
  reloadIssue: () => props.reloadIssue(),
});
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
      <span class="font-mono">{{ issue.id }}-…</span> on a linked repo).
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

      <div
        v-else-if="githubAdminNeedsProjectRepo"
        class="rounded-md border border-primary/25 bg-primary/5 px-2 py-2 text-xs text-secondary-foreground"
      >
        <span class="font-medium text-foreground">GitHub repo missing for this project.</span>
        Link a repository before you can create a branch or open a pull request from this issue.
        <Button
          variant="outline"
          size="sm"
          type="button"
          class="mt-2"
          :disabled="ghWorkflowBusy"
          @click="openLinkProjectRepoDialog"
        >
          Link GitHub repository…
        </Button>
      </div>

      <div
        v-else-if="githubCollaboratorAwaitingProjectRepo"
        class="rounded-md border border-border bg-muted/30 px-2 py-2 text-xs text-secondary-foreground"
      >
        <span class="font-medium text-foreground">GitHub repo not configured.</span>
        A workspace admin must link a GitHub repository to this project before branch and PR actions are
        available here.
      </div>

      <template v-else-if="githubWorkflowFormVisible">
        <div v-if="linkedGhReposLoading" class="text-xs text-muted-foreground">Loading linked repos…</div>
        <template v-else>
          <div v-if="linkedGhReposError" class="text-xs text-red-600">
            {{ linkedGhReposError }}
          </div>
          <div class="flex:col-sm min-w-0">
            <label class="text-xs text-secondary-foreground block" for="gh-repo-picker">Linked repo</label>
            <select
              v-if="linkedGhRepos.length"
              id="gh-repo-picker"
              v-model.number="selectedGhLinkId"
              class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
              :disabled="ghWorkflowBusy"
            >
              <option v-for="repo in linkedGhRepos" :key="repo.id" :value="repo.id">
                {{ repo.fullName }}
              </option>
            </select>
          </div>
        </template>

        <div v-if="selectedGhRepo" class="flex:col-sm min-w-0">
          <label class="text-xs text-secondary-foreground block">Active branch on GitHub</label>
          <IssueGithubBranchCombobox
            v-model:open="githubBranchPickerOpen"
            v-model:search="githubBranchSearch"
            :trigger-label="githubBranchTriggerLabel"
            :branches="filteredGithubRepoBranches"
            :loading="githubRepoBranchesLoading"
            :loading-more="githubRepoBranchesLoadingMore"
            :error="githubRepoBranchesError"
            :create-label="createBranchPickerLabel"
            :create-disabled="createBranchPickerDisabled"
            :selected-branch-name="activeGithubBranch?.branchName ?? null"
            :disabled="ghWorkflowBusy"
            @update:open="onGithubBranchPickerOpenChange"
            @select="selectGithubBranch"
            @create="createGithubBranchFromPicker"
            @load-more="loadMoreGithubRepoBranches"
          />
          <p
            v-if="activeGithubBranch?.branchName && !activeGithubBranch.existsOnGithub"
            class="text-xs text-amber-800 dark:text-amber-100 m-0"
          >
            <span class="font-mono">{{ activeGithubBranch.branchName }}</span>
            is no longer on GitHub. Select another branch or create one.
          </p>
          <a
            v-else-if="activeGithubBranch?.existsOnGithub && activeGithubBranch.htmlUrl"
            :href="activeGithubBranch.htmlUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-primary hover:underline truncate"
          >
            View branch on GitHub
          </a>
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
            :disabled="ghWorkflowBusy || githubInstallationMissingOnGithub || !activeGithubBranch?.branchName"
            @click="openGithubPull"
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

    <IssueLinkGithubRepoDialog
      v-if="canManageGithubSetup"
      v-model:open="linkProjectRepoDialogOpen"
      :workspace-id="workspaceId"
      :project-id="projectId"
      @linked="onProjectGithubRepoLinked"
    />
  </div>
</template>
