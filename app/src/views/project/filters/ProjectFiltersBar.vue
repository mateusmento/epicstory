<script setup lang="ts">
import { Button } from "@/design-system";
import { useProjectFilters } from "@/domain/project";
import { PlusIcon } from "lucide-vue-next";
import FilterItem from "../FilterItem.vue";
import ProjectFilterDropdown from "./ProjectFilterDropdown.vue";

const props = defineProps<{
  projectId: number;
}>();

const { filters, removeFilter, updateFilter } = useProjectFilters(+props.projectId);
</script>

<template>
  <div class="flex:row-md flex:center-y">
    <FilterItem
      v-for="f in filters"
      :key="f.field"
      :project-id="props.projectId"
      :model-value="f"
      @update:model-value="updateFilter(f.field, $event)"
      @remove="removeFilter(f.field)"
    />

    <ProjectFilterDropdown :project-id>
      <Button variant="outline" size="badge" class="flex:row-sm flex:center-y" title="Add filter">
        <PlusIcon class="size-4" />
      </Button>
    </ProjectFilterDropdown>
  </div>
</template>
