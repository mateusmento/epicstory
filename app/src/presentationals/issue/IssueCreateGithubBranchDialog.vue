<script lang="ts" setup>
import type { IGithubCatalogRepository } from "@epicstory/contracts";
import { computed, ref, watch } from "vue";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/design-system";
import IssueSelectGithubRepoDialog from "@/containers/issue/IssueSelectGithubRepoDialog.vue";

const props = defineProps<{
  open: boolean;
  workspaceId: string;
  /** Preselected repo for convenience (optional). */
  selectedRepoGithubId: string | null;
  /** Initial branch name suggestion (optional). */
  initialBranchName?: string;
  busy?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  create: [payload: { repo: IGithubCatalogRepository; branchName: string }];
}>();

const repoPickerOpen = ref(false);
const selectedRepo = ref<IGithubCatalogRepository | null>(null);
const branchName = ref("");

const createDisabled = computed(() => {
  if (props.busy) return true;
  if (!selectedRepo.value) return true;
  return branchName.value.trim().length === 0;
});

function onRepoSelected(repo: IGithubCatalogRepository): void {
  selectedRepo.value = repo;
  if (!branchName.value.trim() && props.initialBranchName?.trim()) {
    branchName.value = props.initialBranchName.trim();
  }
}

function onSubmit(): void {
  if (!selectedRepo.value) return;
  const name = branchName.value.trim();
  if (!name) return;
  emit("create", { repo: selectedRepo.value, branchName: name });
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    branchName.value = props.initialBranchName?.trim() ?? "";
    selectedRepo.value = null;
  },
);
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Create GitHub branch</DialogTitle>
        <DialogDescription>
          Pick a repository, then choose a branch name. The new branch will be linked to this issue.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-3 py-3">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="text-xs text-muted-foreground">Repository</div>
            <div class="text-sm font-medium truncate">
              {{ selectedRepo?.fullName ?? "None selected" }}
            </div>
          </div>
          <Button variant="outline" size="sm" type="button" :disabled="busy" @click="repoPickerOpen = true">
            {{ selectedRepo ? "Change…" : "Select…" }}
          </Button>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-muted-foreground">Branch name</label>
          <Input
            v-model="branchName"
            size="sm"
            placeholder="e.g. EPV1-93-github-integration"
            :disabled="busy"
          />
        </div>

        <div v-if="error" class="text-sm text-destructive">
          {{ error }}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" :disabled="busy" @click="emit('update:open', false)"
          >Cancel</Button
        >
        <Button type="button" :disabled="createDisabled" @click="onSubmit">
          {{ busy ? "Creating…" : "Create branch" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <IssueSelectGithubRepoDialog
    v-model:open="repoPickerOpen"
    :workspace-id="workspaceId"
    :selected-repo-github-id="props.selectedRepoGithubId"
    @selected="onRepoSelected"
  />
</template>
