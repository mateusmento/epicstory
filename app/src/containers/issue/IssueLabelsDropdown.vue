<script setup lang="ts">
import { Menu, MenuContent, MenuTrigger } from "@/design-system";
import IssueLabelsDropdownView from "@/presentationals/issue/IssueLabelsDropdown.vue";
import type { ILabel } from "@epicstory/contracts";
import { useLabels } from "@/domain/labels";
import { computed, onMounted } from "vue";
import IssueLabelsMenu from "./IssueLabelsMenu.vue";

const props = defineProps<{
  disabled?: boolean;
  modelValue: number[];
  /** When set, uses the presentational picker (no create/edit in menu). */
  catalog?: ILabel[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number[]): void;
  (e: "add-label", id: number): void;
  (e: "remove-label", id: number): void;
}>();

const { labelsById, labels, fetchLabels } = useLabels();

onMounted(() => {
  fetchLabels();
});

const catalog = computed(() => props.catalog ?? labels.value);

const selectedLabels = computed(() => {
  return props.modelValue.map((id) => labelsById.value.get(id)).filter((l): l is ILabel => Boolean(l));
});
</script>

<template>
  <IssueLabelsDropdownView
    v-if="props.catalog"
    :disabled="disabled"
    :catalog="catalog"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    @add-label="emit('add-label', $event)"
    @remove-label="emit('remove-label', $event)"
  >
    <template #default="slotProps">
      <slot v-bind="slotProps" />
    </template>
  </IssueLabelsDropdownView>

  <Menu v-else type="dropdown-menu">
    <MenuTrigger as-child @click.stop>
      <slot :selected-labels="selectedLabels" />
    </MenuTrigger>
    <MenuContent as-child>
      <IssueLabelsMenu
        :disabled="disabled"
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
        @add-label="emit('add-label', $event)"
        @remove-label="emit('remove-label', $event)"
      />
    </MenuContent>
  </Menu>
</template>
