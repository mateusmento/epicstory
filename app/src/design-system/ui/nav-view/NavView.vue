<script lang="ts" setup>
import { useNavView } from "./nav-view";

export type NavViewProps = {
  view: string;
  initialContent?: string;
  class?: string;
};

export type NavViewEmits = {
  (e: "trigger", content: string, props: any): void;
  (e: "change", content: string, props: any): void;
};

const props = defineProps<NavViewProps>();
const emit = defineEmits<NavViewEmits>();

useNavView({
  view: props.view,
  initialContent: props.initialContent,
  onTrigger: (content, props) => emit("trigger", content, props),
  onChange: (content, props) => emit("change", content, props),
});
</script>

<template>
  <slot />
</template>
