<script setup lang="ts">
import { Checkbox, MenuInput, MenuItem, MenuSeparator } from "@/design-system";
import type { ILabel } from "@epicstory/contracts";
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    catalog: ILabel[];
    modelValue: number[];
    placeholder?: string;
  }>(),
  {
    disabled: false,
    placeholder: "Search labels…",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: number[]): void;
  (e: "add-label", id: number): void;
  (e: "remove-label", id: number): void;
}>();

const query = ref("");

const isLabelSelected = (labelId: number) => props.modelValue.includes(labelId);

const filteredLabels = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.catalog;
  return props.catalog.filter((l) => l.name.toLowerCase().includes(q));
});

function toggle(id: number) {
  const set = new Set(props.modelValue);
  if (set.has(id)) {
    set.delete(id);
    emit("remove-label", id);
  } else {
    set.add(id);
    emit("add-label", id);
  }
  emit("update:modelValue", Array.from(set));
}
</script>

<template>
  <div class="w-64 min-h-14">
    <MenuInput v-model="query" :placeholder="placeholder" auto-focus />
    <MenuSeparator />
    <MenuItem v-for="label in filteredLabels" :key="label.id" :disabled="disabled" @click="toggle(label.id)">
      <Checkbox
        :model-value="isLabelSelected(label.id)"
        class="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
      />
      <span class="h-2 w-2 rounded-full ring-1 ring-border" :style="{ backgroundColor: label.color }" />
      <span class="capitalize truncate">{{ label.name }}</span>
    </MenuItem>
    <p v-if="filteredLabels.length === 0" class="px-2 py-1.5 text-xs text-muted-foreground">
      No labels match.
    </p>
  </div>
</template>
