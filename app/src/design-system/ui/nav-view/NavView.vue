<script lang="ts" setup>
import { ref } from "vue";
import { useNavView } from "./nav-view";

const props = defineProps<{
  view: string;
}>();

const emit = defineEmits<{
  (e: "trigger", content: string): void;
  (e: "change", content: string): void;
}>();

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
