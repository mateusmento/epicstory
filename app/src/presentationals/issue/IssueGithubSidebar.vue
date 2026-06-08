<script lang="ts" setup>
import type { IIssue } from "@epicstory/contracts";
import { RouterLink } from "vue-router";
import { Button } from "@/design-system";
import type {
  GithubAccessBannerView,
  GithubBranchWorkflowView,
  GithubPrStatusFilter,
  GithubPrView,
} from "./issue-github-sidebar.types";

defineProps<{
  issue: IIssue;
  showGithubSection: boolean;
  pr: GithubPrView;
  access: GithubAccessBannerView;
  workflow: GithubBranchWorkflowView;
}>();

const prStatusFilter = defineModel<GithubPrStatusFilter>("prStatusFilter", { required: true });
const selectedLinkedBranchId = defineModel<number | null>("selectedLinkedBranchId", { required: true });
const openPrAsDraft = defineModel<boolean>("openPrAsDraft", { required: true });
const createBranchDialogOpen = defineModel<boolean>("createBranchDialogOpen", { required: true });

const emit = defineEmits<{
  (e: "open-github-pull", payload: { owner: string; repoName: string; branchName: string }): void;
  (
    e: "create-branch",
    payload: { repo: { owner: string; name: string; githubRepoId: string }; branchName: string },
  ): void;
}>();
</script>

<template>
  <div v-if="showGithubSection" class="flex:col-sm border-t border-border pt-4">
    <div class="text-xs text-secondary-foreground">GitHub pull requests</div>
    <div v-if="pr.loading" class="text-xs text-muted-foreground">Loading…</div>
    <div v-else-if="pr.error" class="text-xs text-red-600">
      {{ pr.error }}
    </div>
    <div v-else-if="(pr.data?.length ?? 0) === 0" class="text-xs text-muted-foreground">
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
      <div v-if="pr.groups.length === 0" class="text-xs text-muted-foreground">
        No pull requests match this filter.
      </div>
      <div v-else class="flex:col-md">
        <div v-for="group in pr.groups" :key="group.fullName" class="flex:col-xs min-w-0">
          <div class="text-xs font-medium text-muted-foreground truncate" :title="group.fullName">
            {{ group.fullName }}
          </div>
          <ul class="flex:col-sm list-none min-w-0 m-0 pl-0">
            <li v-for="prItem in group.pullRequests" :key="prItem.githubPullRequestId" class="min-w-0">
              <a
                :href="prItem.htmlUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-primary hover:underline min-w-0"
              >
                <span class="font-medium truncate">#{{ prItem.prNumber }}</span>
                <span class="text-xs text-muted-foreground shrink-0">
                  {{
                    prItem.merged
                      ? "merged"
                      : prItem.state === "closed"
                        ? "closed"
                        : prItem.draft
                          ? "draft"
                          : "open"
                  }}
                </span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="flex:col-md mt-4 pt-3 border-t border-dashed border-border min-w-0">
      <div
        v-if="access.adminNeedsWorkspaceInstall"
        class="rounded-md border border-border bg-muted/30 px-2 py-2 text-xs text-secondary-foreground"
      >
        Enable GitHub for this workspace before creating branches from issues.
        <RouterLink :to="access.settingsRoute" class="block mt-1 font-medium text-primary underline">
          Integrations → GitHub → Install app
        </RouterLink>
      </div>

      <div
        v-else-if="access.memberNeedsAccountLink"
        class="rounded-md border border-amber-600/30 bg-amber-500/10 px-2 py-2 text-xs text-amber-950 dark:text-amber-100"
      >
        Link your GitHub account for this workspace to create branches and pull requests from issues.
        <RouterLink :to="access.settingsRoute" class="block mt-1 font-medium text-primary underline">
          Integrations → GitHub → Link account
        </RouterLink>
      </div>

      <template v-else-if="workflow.formVisible">
        <div class="flex:col-sm min-w-0">
          <div class="flex items-center justify-between gap-2">
            <label class="text-xs text-secondary-foreground block">Linked branches</label>
            <Button
              variant="outline"
              size="sm"
              type="button"
              :disabled="workflow.mutation.busy"
              @click="createBranchDialogOpen = true"
            >
              Create branch…
            </Button>
          </div>
          <div v-if="workflow.linkedBranches.error" class="text-xs text-red-600">
            {{ workflow.linkedBranches.error }}
          </div>
          <div v-else-if="workflow.linkedBranches.loading" class="text-xs text-muted-foreground">
            Loading linked branches…
          </div>
          <div
            v-else-if="(workflow.linkedBranches.data?.length ?? 0) === 0"
            class="text-xs text-muted-foreground"
          >
            No linked branches yet. Create one, or push a branch whose name/commit message contains the issue
            key.
          </div>
          <ul v-else class="flex flex-col gap-1 m-0 p-0 list-none">
            <li
              v-for="b in workflow.linkedBranches.data ?? []"
              :key="b.id"
              class="flex items-center justify-between gap-2"
            >
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
          v-if="workflow.mutation.installationMissingOnGithub"
          class="rounded-md border border-destructive/35 bg-destructive/10 px-2 py-2 text-xs text-destructive"
        >
          GitHub reports this workspace installation is gone. Ask a workspace admin to reinstall the app.
          <RouterLink :to="access.settingsRoute" class="block mt-1 font-medium underline">
            Integrations → GitHub
          </RouterLink>
        </div>
        <div
          v-else-if="workflow.mutation.reconnectSuggested && !workflow.mutation.installationMissingOnGithub"
          class="rounded-md border border-amber-600/30 bg-amber-500/10 px-2 py-2 text-xs text-amber-950 dark:text-amber-100"
        >
          {{ workflow.mutation.error }}
          <RouterLink :to="access.settingsRoute" class="block mt-1 font-medium text-primary underline">
            Link your GitHub account →
          </RouterLink>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button
            size="sm"
            type="button"
            :disabled="
              workflow.mutation.busy ||
              workflow.mutation.installationMissingOnGithub ||
              !workflow.selectedLinkedBranch?.branchName
            "
            @click="
              workflow.selectedLinkedBranch
                ? emit('open-github-pull', {
                    owner: workflow.selectedLinkedBranch.owner,
                    repoName: workflow.selectedLinkedBranch.repoName,
                    branchName: workflow.selectedLinkedBranch.branchName,
                  })
                : undefined
            "
          >
            Open pull request
          </Button>
        </div>
      </template>

      <div
        v-if="workflow.mutation.busy && workflow.mutation.statusMessage"
        class="text-xs text-muted-foreground"
      >
        {{ workflow.mutation.statusMessage }}
      </div>
      <div
        v-else-if="
          workflow.mutation.error &&
          workflow.formVisible &&
          !(workflow.mutation.reconnectSuggested && !workflow.mutation.installationMissingOnGithub)
        "
        class="text-xs text-red-600"
      >
        {{ workflow.mutation.error }}
      </div>
    </div>

    <slot name="create-branch-dialog" />
  </div>
</template>
