<script setup lang="ts">
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/design-system";
import { FILTER_FIELDS, type ProjectFilterField, useProjectFilters } from "@/domain/project";

const props = defineProps<{
  projectId: number;
}>();

const { filters, addFilter } = useProjectFilters(+props.projectId);

const ALL_FIELDS = Object.keys(FILTER_FIELDS) as ProjectFilterField[];

function availableFields() {
  const selected = new Set(filters.value.map((f) => f.field));
  return ALL_FIELDS.filter((f) => !selected.has(f));
}
</script>

<template>
  <Menu>
    <MenuTrigger as-child>
      <slot />
    </MenuTrigger>
    <MenuContent class="w-56">
      <MenuItem
        v-for="field in availableFields()"
        :key="field"
        class="text-sm"
        @select.prevent="addFilter(field)"
      >
        {{ FILTER_FIELDS[field] }}
      </MenuItem>
      <div v-if="availableFields().length === 0" class="px-2 py-2 text-xs text-muted-foreground">
        All filters already added
      </div>
    </MenuContent>
  </Menu>
</template>
