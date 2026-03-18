<script setup lang="ts">
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/design-system";
import { nextTick, ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  currentTitle: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:open", open: boolean): void;
  (e: "confirm", title: string): void;
}>();

const title = ref(props.currentTitle ?? "");
const inputEl = ref<HTMLInputElement | null>(null);

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return;
    title.value = props.currentTitle ?? "";
    await nextTick();
    inputEl.value?.focus?.();
    inputEl.value?.select?.();
  },
);

function close() {
  emit("update:open", false);
}

function onConfirm() {
  const next = title.value.trim();
  if (!next) return;
  emit("confirm", next);
  close();
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Rename issue</DialogTitle>
      </DialogHeader>

      <div class="grid gap-2">
        <Input
          ref="inputEl"
          v-model="title"
          :disabled="disabled"
          placeholder="Issue title"
          @keydown.enter.prevent="onConfirm"
        />
        <div class="text-xs text-muted-foreground">Press Enter to save</div>
      </div>

      <DialogFooter class="mt-2">
        <Button type="button" variant="outline" :disabled="disabled" @click="close">Cancel</Button>
        <Button type="button" :disabled="disabled || !title.trim()" @click="onConfirm">Save</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
