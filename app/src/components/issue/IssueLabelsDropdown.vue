<script setup lang="ts">
import { Menu, MenuTrigger, MenuContent } from "@/design-system";
import IssueLabelsMenu from "./IssueLabelsMenu.vue";
import { computed } from "vue";
import { useLabels, type Label } from "@/domain/labels";

const props = defineProps<{
  disabled?: boolean;
  modelValue: number[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number[]): void;
}>();

function onUpdateModelValue(value: number[]) {
  emit("update:modelValue", value);
}

const { labelsById } = useLabels();

const selectedLabels = computed(() => {
  return props.modelValue.map((id) => labelsById.value.get(id)).filter((l): l is Label => Boolean(l));
});
</script>

<template>
  <Menu type="dropdown-menu">
    <MenuTrigger as-child>
      <slot :selected-labels="selectedLabels" />
    </MenuTrigger>

    <MenuContent as-child>
      <IssueLabelsMenu
        :disabled="disabled"
        :model-value="modelValue"
        @update:model-value="onUpdateModelValue"
      />
    </MenuContent>
  </Menu>
</template>
