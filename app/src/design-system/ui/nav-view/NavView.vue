<script lang="ts" setup>
import { useNavView } from "./nav-view";

export type NavViewProps = {
  view: string;
  initialContent?: string;
  class?: string;
};

export type NavViewEmits = {
  (e: "trigger", content: string): void;
  (e: "change", content: string): void;
};

const props = defineProps<NavViewProps>();
const emit = defineEmits<NavViewEmits>();

useNavView({
  view: props.view,
  initialContent: props.initialContent,
  onTrigger: (content) => emit("trigger", content),
  onChange: (content) => emit("change", content),
});
</script>

<template>
  <slot />
</template>
