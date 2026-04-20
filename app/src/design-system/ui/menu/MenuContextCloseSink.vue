<script setup lang="ts">
import { injectContextMenuRootContext } from "reka-ui";
import { toRef } from "vue";
import { useSingleContextMenuInstance } from "./context-menu-instance-registry";

const props = defineProps<{ open?: boolean }>();

const ctx = injectContextMenuRootContext();

function close() {
  ctx.onOpenChange(false);
}

const open = toRef(props, "open");

useSingleContextMenuInstance(open, close);
</script>

<template>
  <slot />
</template>
