<script setup lang="ts">
import { Button, Menu, MenuContent, MenuItem, MenuTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import FilterItem from "../FilterItem.vue";
import { FILTER_FIELDS, type ProjectFilterField, useProjectFilters } from "@/domain/project";
import { PlusIcon } from "lucide-vue-next";

const props = defineProps<{
  projectId: number;
}>();

const { filters, addFilter, removeFilter, updateFilter } = useProjectFilters(+props.projectId);

const ALL_FIELDS = Object.keys(FILTER_FIELDS) as ProjectFilterField[];

function availableFields() {
  const selected = new Set(filters.value.map((f) => f.field));
  return ALL_FIELDS.filter((f) => !selected.has(f));
}
</script>

<template>
  <div class="flex:row-md flex:center-y flex-1">
    <div class="flex-1"></div>
    <FilterItem
      v-for="f in filters"
      :key="f.field"
      :project-id="props.projectId"
      :model-value="f"
      @update:model-value="updateFilter(f.field, $event)"
      @remove="removeFilter(f.field)"
    />

    <Menu v-if="filters.length > 0">
      <MenuTrigger as-child>
        <Button variant="outline" size="badge" class="flex:row-sm flex:center-y" title="Add filter">
          <PlusIcon class="size-4" />
        </Button>
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

    <div class="flex-1"></div>

    <Menu>
      <MenuTrigger as-child>
        <Button variant="outline" size="badge" class="flex:row-sm flex:center-y" title="Add filter">
          <!-- <PlusIcon class="size-4" /> -->
          <Icon name="bi-filter" />
        </Button>
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
  </div>
</template>
