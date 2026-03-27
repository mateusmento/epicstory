<script setup lang="ts">
import { Icon } from "@/design-system/icons";
import type { Label } from "@/domain/labels";
import { useLabels } from "@/domain/labels";
import { computed, onMounted, ref, watch } from "vue";
import IssueLabelsDropdown from "../issue/issue-context-menu/IssueLabelsDropdown.vue";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    placeholder?: string;
  }>(),
  {
    disabled: false,
    placeholder: "Labels",
  },
);

const modelValue = defineModel<number[]>({ default: [] });

const open = ref(false);

const { labelsById, fetchLabels } = useLabels();

onMounted(() => {
  fetchLabels();
});

watch(
  open,
  async (isOpen) => {
    if (!isOpen) return;
    await fetchLabels();
  },
  { immediate: false },
);

const selectedLabels = computed(() => {
  return (modelValue.value ?? [])
    .map((id) => labelsById.value.get(id))
    .filter((l): l is Label => Boolean(l))
    .sort((a, b) => a.name.localeCompare(b.name));
});
</script>

<template>
  <IssueLabelsDropdown
    v-for="label in selectedLabels"
    :key="label.id"
    :disabled="disabled"
    v-model="modelValue"
  >
    <button class="flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs bg-white" title="Label">
      <span class="h-2 w-2 rounded-full ring-1 ring-border" :style="{ backgroundColor: label.color }" />
      <span class="max-w-32 text-secondary-foreground capitalize truncate">{{ label.name }}</span>
    </button>
  </IssueLabelsDropdown>

  <IssueLabelsDropdown :disabled="disabled" v-model="modelValue">
    <button
      class="flex items-center gap-2 rounded-full border p-1 text-xs bg-white"
      title="Label"
      :disabled="disabled"
    >
      <Icon name="hi-plus" class="w-3 h-3 text-muted-foreground" />
    </button>
  </IssueLabelsDropdown>
</template>
