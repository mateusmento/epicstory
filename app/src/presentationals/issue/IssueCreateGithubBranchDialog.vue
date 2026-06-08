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

const props = defineProps<{
  open: boolean;
  selectedRepo: IGithubCatalogRepository | null;
  /** Initial branch name suggestion (optional). */
  initialBranchName?: string;
  busy?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "open-repo-picker": [];
  create: [payload: { repo: IGithubCatalogRepository; branchName: string }];
}>();

const branchName = ref("");

const createDisabled = computed(() => {
  if (props.busy) return true;
  if (!props.selectedRepo) return true;
  return branchName.value.trim().length === 0;
});

function onSubmit(): void {
  if (!props.selectedRepo) return;
  const name = branchName.value.trim();
  if (!name) return;
  emit("create", { repo: props.selectedRepo, branchName: name });
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    branchName.value = props.initialBranchName?.trim() ?? "";
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
          <Button
            variant="outline"
            size="sm"
            type="button"
            :disabled="busy"
            @click="emit('open-repo-picker')"
          >
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
</template>
