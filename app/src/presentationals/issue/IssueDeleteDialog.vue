<script setup lang="ts">
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system";
import { computed, ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  title: string;
  nestedCount?: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:open", open: boolean): void;
  (e: "confirm", payload: { deleteSubIssues: boolean }): void;
}>();

const deleteSubIssues = ref(false);
const nestedCount = computed(() => Math.max(0, props.nestedCount ?? 0));
const hasNested = computed(() => nestedCount.value > 0);

const bodyText = computed(() => {
  if (!hasNested.value) {
    return "This issue will be permanently deleted.";
  }
  if (deleteSubIssues.value) {
    return `This issue and all ${nestedCount.value} nested sub-issue(s) will be permanently deleted, including their comments and linked GitHub data in Epicstory. Branches and pull requests on GitHub are not deleted.`;
  }
  return `This issue will be permanently deleted. Its ${nestedCount.value} nested sub-issue(s) will stay and become top-level issues.`;
});

const confirmLabel = computed(() => {
  if (!hasNested.value) return "Delete issue";
  if (deleteSubIssues.value) {
    return `Delete issue and ${nestedCount.value} sub-issues`;
  }
  return "Delete issue only";
});

watch(
  () => props.open,
  (open) => {
    if (open) deleteSubIssues.value = false;
  },
);

function close() {
  emit("update:open", false);
}

function onConfirm() {
  emit("confirm", {
    deleteSubIssues: hasNested.value && deleteSubIssues.value,
  });
  close();
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Delete issue</DialogTitle>
      </DialogHeader>

      <div class="flex flex-col gap-3 text-sm text-muted-foreground">
        <p>
          You are about to delete
          <span class="text-foreground font-medium">{{ title || "this issue" }}</span
          >.
        </p>
        <p>{{ bodyText }}</p>
        <label
          v-if="hasNested"
          class="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-foreground"
        >
          <Checkbox v-model="deleteSubIssues" class="mt-0.5" :disabled="disabled" />
          <span class="text-sm"> Also delete {{ nestedCount }} nested sub-issue(s) </span>
        </label>
      </div>

      <DialogFooter class="mt-2">
        <Button type="button" variant="outline" :disabled="disabled" @click="close">Cancel</Button>
        <Button type="button" variant="flat" intent="destructive" :disabled="disabled" @click="onConfirm">
          {{ confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
