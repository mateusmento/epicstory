<script lang="ts" setup>
import { Dialog, DialogContent } from "@/design-system";
import { provide, reactive, readonly, ref } from "vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import { CONFIRM_DIALOG_KEY, type ConfirmDialogContext, type ConfirmDialogOptions } from "./confirm-dialog";

const dialogOpen = ref(false);

const state = reactive({
  title: "",
  description: undefined as string | undefined,
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  destructive: false,
});

let resolvePromise: ((value: boolean) => void) | null = null;

function settle(result: boolean) {
  const resolve = resolvePromise;
  resolvePromise = null;
  if (resolve) {
    resolve(result);
  }
  dialogOpen.value = false;
}

function onUpdateOpen(nextOpen: boolean) {
  if (!nextOpen && resolvePromise) {
    const resolve = resolvePromise;
    resolvePromise = null;
    resolve(false);
  }
  dialogOpen.value = nextOpen;
}

function open(options: ConfirmDialogOptions): Promise<boolean> {
  if (resolvePromise) {
    const stale = resolvePromise;
    resolvePromise = null;
    stale(false);
  }

  state.title = options.title;
  state.description = options.description;
  state.confirmLabel = options.confirmLabel ?? "Confirm";
  state.cancelLabel = options.cancelLabel ?? "Cancel";
  state.destructive = options.destructive ?? false;

  return new Promise<boolean>((resolve) => {
    resolvePromise = resolve;
    dialogOpen.value = true;
  });
}

function close() {
  settle(false);
}

function toggle() {
  if (dialogOpen.value) {
    settle(false);
  }
}

const context: ConfirmDialogContext = {
  open,
  close,
  toggle,
  isOpen: readonly(dialogOpen),
};

provide(CONFIRM_DIALOG_KEY, context);
</script>

<template>
  <slot />
  <Dialog :open="dialogOpen" @update:open="onUpdateOpen">
    <DialogContent class="max-w-md">
      <ConfirmDialog
        :title="state.title"
        :description="state.description"
        :confirm-label="state.confirmLabel"
        :cancel-label="state.cancelLabel"
        :destructive="state.destructive"
        @confirm="settle(true)"
        @cancel="settle(false)"
      />
    </DialogContent>
  </Dialog>
</template>
