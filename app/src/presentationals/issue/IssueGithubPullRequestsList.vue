<script lang="ts" setup>
import type { AsyncDataView } from "@/lib/async";
import type { GithubPullRequestGroup, GithubPrStatusFilter } from "@/lib/github";
import type { IGithubIssuePullRequestLink, IIssue } from "@epicstory/contracts";

defineProps<{
  issue: IIssue;
  pr: AsyncDataView<IGithubIssuePullRequestLink[]> & { groups: GithubPullRequestGroup[] };
}>();

const prStatusFilter = defineModel<GithubPrStatusFilter>("prStatusFilter", { required: true });
</script>

<template>
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
</template>
