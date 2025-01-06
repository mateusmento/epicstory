<script lang="ts" setup>
import { ref } from "vue";
import { useNavView } from "./nav-view";

export type NavViewProps = {
  view: string;
  content: string;
};

export type NavViewEmits = {
  (e: "trigger", content: string): void;
  (e: "change", content: string): void;
};

const props = defineProps<Omit<NavViewProps, "content">>();
const emit = defineEmits<NavViewEmits>();

const content = defineModel<string>("content", { required: true });

useNavView({
  view: props.view,
  content,
  props: ref<any>(),
  onTrigger: (content) => emit("trigger", content),
  onChange: (content) => emit("change", content),
});
</script>

<template>
  <slot />
</template>
