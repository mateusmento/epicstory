<script setup lang="ts">
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, Separator } from "@/design-system";
import { useSprintReview } from "@/domain/sprint";
import { SprintIncompleteItemRow, VelocityChart } from "@/presentationals/sprint";
import type { ISprintItem } from "@epicstory/contracts";
import { ChevronDownIcon } from "lucide-vue-next";
import { computed, toRef } from "vue";

const props = defineProps<{
  sprintId: number;
  teamId: number;
}>();

const {
  sprint,
  incompleteItems,
  completedItems,
  futureSprints,
  successPercent,
  completedSprintsForChart,
  handleDestinationChange,
} = useSprintReview(toRef(props, "sprintId"), toRef(props, "teamId"));

function onDestinationChange(item: ISprintItem, destinationSprintId: number | null) {
  handleDestinationChange(item, destinationSprintId === null ? "backlog" : String(destinationSprintId));
}

const highlightSprintId = computed(() => sprint.value?.id);
</script>

<template>
  <div class="flex:col gap-4">
    <!-- Stats -->
    <div class="flex:row gap-4 text-sm text-muted-foreground">
      <span>
        <span class="font-medium text-foreground">{{ sprint?.completedItemCount ?? 0 }}</span> done
      </span>
      <span>
        <span class="font-medium text-foreground">{{ incompleteItems.length }}</span> incomplete
      </span>
      <span>
        <span class="font-medium text-foreground">{{ sprint?.itemCount ?? 0 }}</span> total
      </span>
      <span class="font-medium text-primary">{{ successPercent }}% success</span>
    </div>

    <!-- Velocity chart -->
    <VelocityChart :sprints="completedSprintsForChart" :highlight-sprint-id="highlightSprintId" />

    <Separator />

    <!-- Incomplete issues -->
    <div v-if="incompleteItems.length > 0" class="flex:col gap-2">
      <div class="text-sm font-medium">Incomplete issues ({{ incompleteItems.length }})</div>
      <SprintIncompleteItemRow
        v-for="item in incompleteItems"
        :key="item.id"
        :item="item"
        :future-sprints="futureSprints"
        @destination-change="onDestinationChange"
      />
    </div>

    <!-- Completed issues -->
    <Collapsible v-if="completedItems.length > 0">
      <CollapsibleTrigger as-child>
        <Button variant="ghost" size="sm" class="text-muted-foreground">
          <ChevronDownIcon class="size-4 mr-1" />
          Completed issues ({{ completedItems.length }})
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div class="flex:col gap-1 mt-2">
          <div
            v-for="item in completedItems"
            :key="item.id"
            class="flex:row-md flex:center-y py-1.5 px-3 rounded text-muted-foreground"
          >
            <div class="text-xs font-mono shrink-0">
              {{ item.issue?.issueKey ?? `#${item.issue?.id}` }}
            </div>
            <div class="text-sm flex-1 truncate">{{ item.issue?.title }}</div>
            <span class="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 dark:bg-green-950"
              >done</span
            >
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  </div>
</template>
