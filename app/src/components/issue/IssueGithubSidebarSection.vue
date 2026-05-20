<script lang="ts" setup>
import type { IIssue } from "@epicstory/contracts";
import { computed, toRef } from "vue";
import { RouterLink } from "vue-router";
import { Button, Input } from "@/design-system";
import { useIssueGithubSidebar } from "@/domain/github";

const props = defineProps<{
  workspaceId: string;
  projectId: string;
  issue: IIssue;
  reloadIssueActivityFeed: () => Promise<void>;
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
  selectedGhRepo,
  ghWorkflowBusy,
  ghWorkflowError,
  headBranchLeaf,
  openPrAsDraft,
  prStatusFilter,
  githubPullRequestGroups,
  githubMemberAuthRequired,
  createGithubBranch,
  openGithubPull,
} = useIssueGithubSidebar({
  workspaceId: toRef(props, "workspaceId"),
  projectId: toRef(props, "projectId"),
  issue: computed(() => props.issue),
  reloadIssueActivityFeed: () => props.reloadIssueActivityFeed(),
});
</script>

<template>
  <div class="flex:col-sm border-t border-border pt-4">
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

    <!-- Epicstory-created branch / PR flow (GitHub App user token) -->
    <div
      v-if="linkedGhReposLoading"
      class="text-xs text-muted-foreground mt-4 pt-3 border-t border-dashed border-border"
    >
      Loading linked repos…
    </div>
    <div
      v-else-if="linkedGhReposError"
      class="text-xs text-red-600 mt-4 pt-3 border-t border-dashed border-border"
    >
      {{ linkedGhReposError }}
    </div>
    <div
      v-else-if="!linkedGhRepos.length"
      class="text-xs text-muted-foreground mt-4 pt-3 border-t border-dashed border-border"
    >
      Link a GitHub repo to this project to create branches and PRs here.
    </div>
    <div v-else class="flex:col-md mt-4 pt-3 border-t border-dashed border-border min-w-0">
      <div class="flex:col-sm min-w-0">
        <label class="text-xs text-secondary-foreground block" for="gh-repo-picker">Linked repo</label>
        <select
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
      <div class="flex:col-sm min-w-0">
        <label class="text-xs text-secondary-foreground block" for="gh-head-branch"> Head branch </label>
        <Input
          id="gh-head-branch"
          v-model="headBranchLeaf"
          size="sm"
          class="text-xs"
          placeholder="Issue ID branch from “Create branch”"
          :disabled="ghWorkflowBusy"
        />
      </div>
      <label class="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
        <input v-model="openPrAsDraft" type="checkbox" class="rounded border-input" />
        Draft pull request
      </label>
      <div
        v-if="githubMemberAuthRequired"
        class="rounded-md border border-primary/25 bg-primary/5 px-2 py-2 text-xs text-secondary-foreground"
      >
        Branch and PR actions run as <span class="font-medium text-foreground">your</span> GitHub user. The
        linked repo here only chooses the target repository — you still need member OAuth.
        <RouterLink :to="githubSettingsRoute" class="block mt-1.5 font-medium text-primary underline">
          Link your GitHub account in workspace settings →
        </RouterLink>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          type="button"
          :disabled="ghWorkflowBusy || selectedGhRepo == null || githubMemberAuthRequired"
          @click="createGithubBranch"
        >
          Create branch
        </Button>
        <Button
          size="sm"
          type="button"
          :disabled="ghWorkflowBusy || selectedGhRepo == null || githubMemberAuthRequired"
          @click="openGithubPull"
        >
          Open pull request
        </Button>
      </div>
      <div v-if="ghWorkflowBusy" class="text-xs text-muted-foreground">Working with GitHub…</div>
      <div v-else-if="ghWorkflowError" class="text-xs text-red-600">{{ ghWorkflowError }}</div>
    </div>
  </div>
</template>
