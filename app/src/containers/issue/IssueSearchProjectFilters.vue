<script setup lang="ts">
import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  OverflowContainer,
  OverflowEllipsis,
  OverflowItem,
} from "@/design-system";
import { srfClasses } from "@/design-system/ui/surface/surface-intent-classes";
import { cn } from "@/design-system/utils";
import type { Project } from "@epicstory/contracts";
import { Check, MoreHorizontal } from "lucide-vue-next";
import { computed } from "vue";

export type IssueSearchProject = Pick<Project, "id" | "name">;

const props = defineProps<{
  projects: IssueSearchProject[];
}>();

/** `null` = all projects in the workspace. */
const selectedProjectIds = defineModel<number[] | null>({ required: true });

const isAllProjects = computed(() => selectedProjectIds.value === null);

const projectsById = computed(() => new Map(props.projects.map((project) => [String(project.id), project])));

function isProjectSelected(projectId: number) {
  return selectedProjectIds.value?.includes(projectId) ?? false;
}

function selectAllProjects() {
  selectedProjectIds.value = null;
}

function toggleProject(projectId: number) {
  const current = selectedProjectIds.value;
  if (current == null) {
    selectedProjectIds.value = [projectId];
    return;
  }

  if (current.includes(projectId)) {
    const next = current.filter((id) => id !== projectId);
    selectedProjectIds.value = next.length > 0 ? next : null;
    return;
  }

  selectedProjectIds.value = [...current, projectId];
}

function hiddenProjects(hiddenSegmentKeys: string[]): IssueSearchProject[] {
  return hiddenSegmentKeys
    .map((key) => projectsById.value.get(key))
    .filter((project): project is IssueSearchProject => project != null);
}

function hiddenSelectedCount(hiddenSegmentKeys: string[]): number {
  const selected = selectedProjectIds.value;
  if (selected == null || selected.length === 0) return 0;
  const hiddenKeys = new Set(hiddenSegmentKeys);
  return selected.filter((id) => hiddenKeys.has(String(id))).length;
}

function chipClass(active: boolean) {
  return cn(
    "shrink-0 rounded-md px-2 py-1 text-xs outline-none transition-colors",
    active ? srfClasses("soft", "primary") : srfClasses("soft", "default"),
  );
}
</script>

<template>
  <OverflowContainer mode="auto" :gap="4" class="min-w-0 w-full items-center border-b px-3 py-2">
    <OverflowItem segment-key="all" pinned>
      <button type="button" :class="chipClass(isAllProjects)" @click="selectAllProjects">All</button>
    </OverflowItem>

    <OverflowItem
      v-for="project in projects"
      :key="project.id"
      :segment-key="String(project.id)"
      :max-width-px="140"
    >
      <button
        type="button"
        :class="chipClass(isProjectSelected(project.id))"
        :title="project.name"
        @click="toggleProject(project.id)"
      >
        <div class="block max-w-32 truncate">{{ project.name }}</div>
      </button>
    </OverflowItem>

    <OverflowEllipsis v-slot="{ collapsed, hiddenSegmentKeys }">
      <!-- Always mount the trigger so ellipsis width is measurable on first paint. -->
      <Menu type="dropdown-menu">
        <MenuTrigger as-child>
          <Button
            variant="soft"
            :intent="hiddenSelectedCount(hiddenSegmentKeys) > 0 ? 'primary' : 'default'"
            size="icon"
            class="shrink-0 tabular-nums"
            :aria-label="
              hiddenSelectedCount(hiddenSegmentKeys) > 0
                ? `${hiddenSelectedCount(hiddenSegmentKeys)} selected projects hidden`
                : 'More projects'
            "
          >
            <div v-if="hiddenSelectedCount(hiddenSegmentKeys) > 0">
              +{{ hiddenSelectedCount(hiddenSegmentKeys) }} projects
            </div>
            <MoreHorizontal v-else class="size-4" />
          </Button>
        </MenuTrigger>
        <MenuContent v-if="collapsed" align="end" class="max-h-72 overflow-y-auto">
          <MenuItem
            v-for="project in hiddenProjects(hiddenSegmentKeys)"
            :key="project.id"
            class="flex:row-md flex:center-y gap-2"
            @select="toggleProject(project.id)"
          >
            <Check
              class="size-3.5 shrink-0"
              :class="isProjectSelected(project.id) ? 'opacity-100' : 'opacity-0'"
            />
            <span class="truncate">{{ project.name }}</span>
          </MenuItem>
        </MenuContent>
      </Menu>
    </OverflowEllipsis>
  </OverflowContainer>
</template>
