<script setup lang="ts">
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/design-system";

const props = defineProps<{
  open: boolean;
  title: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:open", open: boolean): void;
  (e: "confirm"): void;
}>();

function close() {
  emit("update:open", false);
}

function onConfirm() {
  emit("confirm");
  close();
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Delete issue</DialogTitle>
      </DialogHeader>

      <div class="text-sm text-muted-foreground">
        This will permanently delete
        <span class="text-foreground font-medium">{{ title || "this issue" }}</span
        >.
      </div>

      <DialogFooter class="mt-2">
        <Button type="button" variant="outline" :disabled="disabled" @click="close">Cancel</Button>
        <Button type="button" variant="destructive" :disabled="disabled" @click="onConfirm">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
