<script lang="ts" setup>
import type { AsyncDataView } from "@/lib/async";
import type { GithubIntegrationAccess, GithubWorkflowMutation } from "@/lib/github";
import type { IGithubIssueBranchLink } from "@epicstory/contracts";
import { RouterLink } from "vue-router";
import { Button } from "@/design-system";

defineProps<{
  access: GithubIntegrationAccess;
  formVisible: boolean;
  linkedBranches: AsyncDataView<IGithubIssueBranchLink[]>;
  mutation: GithubWorkflowMutation;
  selectedLinkedBranch: IGithubIssueBranchLink | null;
}>();

const selectedLinkedBranchId = defineModel<number | null>("selectedLinkedBranchId", { required: true });
const openPrAsDraft = defineModel<boolean>("openPrAsDraft", { required: true });
const createBranchDialogOpen = defineModel<boolean>("createBranchDialogOpen", { required: true });

const emit = defineEmits<{
  (e: "open-github-pull", payload: { owner: string; repoName: string; branchName: string }): void;
}>();
</script>

<template>
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

  <template v-else-if="formVisible">
    <div class="flex:col-sm min-w-0">
      <div class="flex items-center justify-between gap-2">
        <label class="text-xs text-secondary-foreground block">Linked branches</label>
        <Button
          variant="outline"
          size="sm"
          type="button"
          :disabled="mutation.busy"
          @click="createBranchDialogOpen = true"
        >
          Create branch…
        </Button>
      </div>
      <div v-if="linkedBranches.error" class="text-xs text-red-600">
        {{ linkedBranches.error }}
      </div>
      <div v-else-if="linkedBranches.loading" class="text-xs text-muted-foreground">
        Loading linked branches…
      </div>
      <div v-else-if="(linkedBranches.data?.length ?? 0) === 0" class="text-xs text-muted-foreground">
        No linked branches yet. Create one, or push a branch whose name/commit message contains the issue key.
      </div>
      <ul v-else class="flex flex-col gap-1 m-0 p-0 list-none">
        <li
          v-for="b in linkedBranches.data ?? []"
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
      v-if="mutation.installationMissingOnGithub"
      class="rounded-md border border-destructive/35 bg-destructive/10 px-2 py-2 text-xs text-destructive"
    >
      GitHub reports this workspace installation is gone. Ask a workspace admin to reinstall the app.
      <RouterLink :to="access.settingsRoute" class="block mt-1 font-medium underline">
        Integrations → GitHub
      </RouterLink>
    </div>
    <div
      v-else-if="mutation.reconnectSuggested && !mutation.installationMissingOnGithub"
      class="rounded-md border border-amber-600/30 bg-amber-500/10 px-2 py-2 text-xs text-amber-950 dark:text-amber-100"
    >
      {{ mutation.error }}
      <RouterLink :to="access.settingsRoute" class="block mt-1 font-medium text-primary underline">
        Link your GitHub account →
      </RouterLink>
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        size="sm"
        type="button"
        :disabled="mutation.busy || mutation.installationMissingOnGithub || !selectedLinkedBranch?.branchName"
        @click="
          selectedLinkedBranch
            ? emit('open-github-pull', {
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

  <div v-if="mutation.busy && mutation.statusMessage" class="text-xs text-muted-foreground">
    {{ mutation.statusMessage }}
  </div>
  <div
    v-else-if="
      mutation.error && formVisible && !(mutation.reconnectSuggested && !mutation.installationMissingOnGithub)
    "
    class="text-xs text-red-600"
  >
    {{ mutation.error }}
  </div>
</template>
