<script setup lang="ts">
import IssueLabelTagsView from "@/presentationals/issue/IssueLabelTags.vue";
import { useLabels } from "@/domain/labels";
import type { ILabel } from "@epicstory/contracts";
import { computed, type HTMLAttributes } from "vue";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    placeholder?: string;
    class?: HTMLAttributes["class"];
    /** Labels already on the issue — used for display without waiting on the workspace catalog. */
    issueLabels?: ILabel[];
  }>(),
  {
    disabled: false,
    placeholder: "Labels",
    issueLabels: () => [],
  },
);

const emit = defineEmits<{
  (e: "add-label", id: number): void;
  (e: "remove-label", id: number): void;
}>();

const modelValue = defineModel<number[]>({ default: [] });

const { labels } = useLabels();

const catalog = computed(() => {
  const byId = new Map<number, ILabel>();
  for (const label of labels.value) byId.set(label.id, label);
  for (const label of props.issueLabels) byId.set(label.id, label);
  return [...byId.values()];
});
</script>

<template>
  <IssueLabelTagsView
    v-model="modelValue"
    :catalog="catalog"
    :disabled="disabled"
    :placeholder="placeholder"
    :class="props.class"
    @add-label="emit('add-label', $event)"
    @remove-label="emit('remove-label', $event)"
  />
</template>
