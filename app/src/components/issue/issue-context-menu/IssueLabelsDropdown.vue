<script setup lang="ts">
import { Menu, MenuTrigger, MenuContent } from "@/design-system";
import IssueLabelsMenu from "./IssueLabelsMenu.vue";

const props = defineProps<{
  workspaceId: number;
  disabled?: boolean;
  modelValue: number[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number[]): void;
}>();

function onUpdateModelValue(value: number[]) {
  emit("update:modelValue", value);
}
</script>

<template>
  <Menu type="dropdown-menu">
    <MenuTrigger as-child>
      <slot />
    </MenuTrigger>

    <MenuContent as-child>
      <IssueLabelsMenu
        :workspace-id="workspaceId"
        :disabled="disabled"
        :model-value="modelValue"
        @update:model-value="onUpdateModelValue"
      />
    </MenuContent>
  </Menu>
</template>
