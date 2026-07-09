<script setup lang="ts">
import { OverflowContainer, OverflowEllipsis, OverflowItem } from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { ILabel } from "@epicstory/contracts";
import { computed, type HTMLAttributes } from "vue";
import IssueLabelsDropdown from "./IssueLabelsDropdown.vue";
import { cn } from "@/design-system/utils";

const props = withDefaults(
  defineProps<{
    catalog: ILabel[];
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

const labelsById = computed(() => new Map(props.catalog.map((l) => [l.id, l])));

const selectedLabels = computed(() => {
  return (modelValue.value ?? [])
    .map((id) => labelsById.value.get(id))
    .filter((l): l is ILabel => Boolean(l))
    .sort((a, b) => a.name.localeCompare(b.name));
});
</script>

<template>
  <OverflowContainer mode="auto" :gap="4" :class="cn('min-w-0 max-w-full', props.class)">
    <OverflowItem
      v-for="label in selectedLabels"
      :key="label.id"
      :segment-key="String(label.id)"
      :max-width-px="128"
    >
      <IssueLabelsDropdown
        :disabled="disabled"
        :catalog="catalog"
        v-model="modelValue"
        @add-label="emit('add-label', $event)"
        @remove-label="emit('remove-label', $event)"
      >
        <button
          type="button"
          class="flex max-w-full items-center gap-2 rounded-full border bg-card px-2 py-0.5 text-xs"
          title="Label"
        >
          <span
            class="h-2 w-2 shrink-0 rounded-full ring-1 ring-border"
            :style="{ backgroundColor: label.color }"
          />
          <span class="max-w-32 truncate capitalize text-secondary-foreground">{{ label.name }}</span>
        </button>
      </IssueLabelsDropdown>
    </OverflowItem>

    <OverflowEllipsis v-slot="{ hiddenCount, collapsed }">
      <span
        v-if="collapsed"
        class="rounded-full px-2 py-0.5 text-xs text-muted-foreground"
        :title="`+${hiddenCount} more`"
      >
        +{{ hiddenCount }}
      </span>
    </OverflowEllipsis>

    <OverflowItem pinned>
      <IssueLabelsDropdown
        :disabled="disabled"
        :catalog="catalog"
        v-model="modelValue"
        @add-label="emit('add-label', $event)"
        @remove-label="emit('remove-label', $event)"
      >
        <button
          type="button"
          class="flex items-center gap-2 rounded-full border bg-card p-1 text-xs"
          title="Label"
          :disabled="disabled"
        >
          <Icon name="hi-plus" class="h-3 w-3 text-muted-foreground" />
        </button>
      </IssueLabelsDropdown>
    </OverflowItem>
  </OverflowContainer>
</template>
