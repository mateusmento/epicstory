<script setup lang="ts">
import { injectContextMenuRootContext } from "reka-ui";
import { onBeforeUnmount, onMounted } from "vue";
import { registerContextMenu } from "./context-menu-registry";

const props = defineProps<{
  menuId: number;
}>();

const ctx = injectContextMenuRootContext();

let unregister: (() => void) | undefined;

onMounted(() => {
  unregister = registerContextMenu(props.menuId, () => ctx.onOpenChange(false));
});

onBeforeUnmount(() => {
  unregister?.();
});
</script>

<template>
  <!-- no UI -->
  <span class="hidden" />
</template>
