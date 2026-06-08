<script setup lang="ts">
import { Menu, MenuTrigger, MenuContent } from "@/design-system";
import type { ILabel } from "@epicstory/contracts";
import { computed } from "vue";
import IssueLabelsPicker from "./IssueLabelsPicker.vue";

const props = defineProps<{
  disabled?: boolean;
  modelValue: number[];
  catalog: ILabel[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number[]): void;
  (e: "add-label", id: number): void;
  (e: "remove-label", id: number): void;
}>();

const labelsById = computed(() => new Map(props.catalog.map((l) => [l.id, l])));

const selectedLabels = computed(() => {
  return props.modelValue.map((id) => labelsById.value.get(id)).filter((l): l is ILabel => Boolean(l));
});

function onUpdateModelValue(value: number[]) {
  emit("update:modelValue", value);
}
</script>

<template>
  <Menu type="dropdown-menu">
    <MenuTrigger as-child @click.stop>
      <slot :selected-labels="selectedLabels" />
    </MenuTrigger>

    <MenuContent as-child>
      <IssueLabelsPicker
        :disabled="disabled"
        :catalog="catalog"
        :model-value="modelValue"
        @update:model-value="onUpdateModelValue"
        @add-label="emit('add-label', $event)"
        @remove-label="emit('remove-label', $event)"
      />
    </MenuContent>
  </Menu>
</template>
