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
import type { ProjectTeamTab } from "@/lib/project";
import { ChevronDownIcon, MoreHorizontal } from "lucide-vue-next";
import { computed } from "vue";
import { RouterLink } from "vue-router";

const props = defineProps<{
  tabs: ProjectTeamTab[];
  activeProjectId: number;
  showMoreMenu: boolean;
  overflowTabs: ProjectTeamTab[];
  overflowLoading?: boolean;
}>();

const emit = defineEmits<{
  moreMenuOpen: [open: boolean];
}>();

function onMoreMenuOpen(value: unknown) {
  emit("moreMenuOpen", value === true);
}

const tabsById = computed(() => new Map(props.tabs.map((tab) => [String(tab.id), tab])));

function layoutHiddenTabs(hiddenSegmentKeys: string[]): ProjectTeamTab[] {
  return hiddenSegmentKeys
    .map((key) => tabsById.value.get(key))
    .filter((tab): tab is ProjectTeamTab => tab != null);
}
</script>

<template>
  <OverflowContainer as="nav" mode="auto" :gap="4" class="min-w-0" aria-label="Team projects">
    <OverflowItem
      v-for="tab in tabs"
      :key="tab.id"
      :segment-key="String(tab.id)"
      :pinned="tab.id === activeProjectId"
    >
      <Button
        as-child
        :variant="tab.id === activeProjectId ? 'soft' : 'ghost'"
        size="icon"
        class="shrink-0"
        :intent="tab.id === activeProjectId ? 'primary' : 'default'"
      >
        <RouterLink :to="tab.to" class="truncate max-w-40">
          {{ tab.name }}
        </RouterLink>
      </Button>
    </OverflowItem>

    <OverflowEllipsis v-slot="{ collapsed, hiddenSegmentKeys }">
      <!-- Always mount the trigger so ellipsis width is measurable on first paint. -->
      <Menu type="dropdown-menu">
        <MenuTrigger as-child>
          <Button
            variant="soft"
            intent="default"
            size="icon"
            class="shrink-0"
            title="Hidden projects"
            aria-label="Hidden projects"
          >
            <MoreHorizontal class="size-4" />
          </Button>
        </MenuTrigger>
        <MenuContent v-if="collapsed" align="start" class="max-h-72 overflow-y-auto">
          <MenuItem v-for="tab in layoutHiddenTabs(hiddenSegmentKeys)" :key="tab.id" as-child>
            <RouterLink :to="tab.to" class="w-full cursor-pointer truncate">
              {{ tab.name }}
            </RouterLink>
          </MenuItem>
        </MenuContent>
      </Menu>
    </OverflowEllipsis>

    <OverflowItem v-if="showMoreMenu" segment-key="more" pinned>
      <Menu type="dropdown-menu" @update:open="onMoreMenuOpen">
        <MenuTrigger as-child>
          <Button variant="soft" intent="secondary" size="icon" class="shrink-0">
            More
            <ChevronDownIcon class="size-3.5 opacity-70" />
          </Button>
        </MenuTrigger>
        <MenuContent align="start" class="max-h-72 overflow-y-auto">
          <MenuItem v-if="overflowLoading" disabled class="text-xs text-muted-foreground">
            Loading projects…
          </MenuItem>
          <MenuItem v-else-if="overflowTabs.length === 0" disabled class="text-xs text-muted-foreground">
            No other projects
          </MenuItem>
          <MenuItem v-for="tab in overflowTabs" :key="tab.id" as-child>
            <RouterLink :to="tab.to" class="w-full cursor-pointer truncate">
              {{ tab.name }}
            </RouterLink>
          </MenuItem>
        </MenuContent>
      </Menu>
    </OverflowItem>
  </OverflowContainer>
</template>
