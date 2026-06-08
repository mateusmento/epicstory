<script setup lang="ts">
import IssueLabelTagsView from "@/presentationals/issue/IssueLabelTags.vue";
import { useLabels } from "@/domain/labels";
import { onMounted, watch, type HTMLAttributes } from "vue";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    placeholder?: string;
    class?: HTMLAttributes["class"];
  }>(),
  {
    disabled: false,
    placeholder: "Labels",
  },
);

const emit = defineEmits<{
  (e: "add-label", id: number): void;
  (e: "remove-label", id: number): void;
}>();

const modelValue = defineModel<number[]>({ default: [] });

const { labels, fetchLabels } = useLabels();

onMounted(() => {
  fetchLabels();
});

watch(modelValue, () => {
  fetchLabels();
});
</script>

<template>
  <IssueLabelTagsView
    v-model="modelValue"
    :catalog="labels"
    :disabled="disabled"
    :placeholder="placeholder"
    :class="props.class"
    @add-label="emit('add-label', $event)"
    @remove-label="emit('remove-label', $event)"
  />
</template>
