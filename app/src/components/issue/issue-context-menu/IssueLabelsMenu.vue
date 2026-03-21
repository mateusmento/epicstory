<script setup lang="ts">
import LabelSelectMenu from "@/components/labels/LabelSelectMenu.vue";

const props = defineProps<{
  workspaceId: number;
  modelValue: number[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number[]): void;
}>();
</script>

<template>
  <div class="px-2 py-2 w-72" @click.stop>
    <LabelSelectMenu
      :workspace-id="workspaceId"
      :disabled="disabled"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>
