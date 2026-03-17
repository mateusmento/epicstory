<script setup lang="ts">
import { Icon } from "@/design-system/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/design-system/ui/popover";
import type { Label } from "@/domain/labels";
import { useLabels } from "@/domain/labels";
import { computed, onMounted, ref, watch } from "vue";
import LabelSelectMenu from "./LabelSelectMenu.vue";

const props = withDefaults(
  defineProps<{
    workspaceId: number;
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
  fetchLabels(props.workspaceId);
});

watch(
  open,
  async (isOpen) => {
    if (!isOpen) return;
    await fetchLabels(props.workspaceId);
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
  <Popover v-for="l in selectedLabels" :key="l.id">
    <PopoverTrigger as-child>
      <button class="flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs bg-white" title="Label">
        <span class="h-2 w-2 rounded-full ring-1 ring-border" :style="{ backgroundColor: l.color }" />
        <span class="max-w-32 text-secondary-foreground truncate">{{ l.name }}</span>
      </button>
    </PopoverTrigger>

    <PopoverContent align="start" class="w-fit">
      <LabelSelectMenu
        v-model="modelValue"
        :workspace-id="workspaceId"
        :disabled="disabled"
        :placeholder="placeholder"
      />
    </PopoverContent>
  </Popover>

  <Popover>
    <PopoverTrigger as-child>
      <button
        class="flex items-center gap-2 rounded-full border p-1 text-xs bg-white"
        title="Label"
        :disabled="disabled"
      >
        <Icon name="hi-plus" class="w-3 h-3 text-muted-foreground" />
      </button>
    </PopoverTrigger>

    <PopoverContent align="start" class="w-fit">
      <LabelSelectMenu
        v-model="modelValue"
        :workspace-id="workspaceId"
        :disabled="disabled"
        :placeholder="placeholder"
      />
    </PopoverContent>
  </Popover>
</template>
