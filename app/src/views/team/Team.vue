<script setup lang="ts">
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
} from "@/design-system";
import { useTeamSprints } from "@/domain/sprint";
import { CheckCircleIcon } from "lucide-vue-next";
import CompleteSprintPopover from "@/containers/sprint/CompleteSprintPopover.vue";
import SprintReviewDrawer from "./SprintReviewDrawer.vue";

const props = defineProps<{ workspaceId: string; teamId: string }>();

const {
  team,
  sprints,
  activeSprint,
  completedSprints,
  reviewSprintId,
  reviewDrawerOpen,
  openReview,
  closeReview,
  onSprintCompleted,
  sprintDateLabel,
  burndownProgress,
  successPercent,
} = useTeamSprints(props);
</script>

<template>
  <div class="flex:col h-full min-h-0">
    <!-- Header -->
    <div class="flex:row-md flex:center-y justify-between px-6 py-4 border-b border-border">
      <div>
        <h1 class="text-lg font-semibold">{{ team?.name ?? "Team" }}</h1>
        <p class="text-sm text-muted-foreground">Sprints</p>
      </div>
    </div>

    <div class="flex:col flex-1 min-h-0 overflow-auto px-6 py-4 gap-1">
      <!-- Active sprint -->
      <div v-if="activeSprint" class="flex:col gap-2 mb-2">
        <div class="flex:row-md flex:center-y py-3 px-2 rounded-lg bg-primary/5 border border-primary/20">
          <div class="text-xs text-muted-foreground w-14 shrink-0">
            {{ sprintDateLabel(activeSprint) }}
          </div>
          <div class="w-2 h-2 rounded-full bg-primary shrink-0" />
          <div class="font-medium text-sm flex-1">{{ activeSprint.name }}</div>
          <Badge class="text-xs">Current</Badge>
          <div class="text-xs text-muted-foreground ml-4">{{ activeSprint.itemCount }} scope</div>
          <CompleteSprintPopover
            :sprint="activeSprint"
            action="complete"
            class="ml-2"
            @completed="onSprintCompleted"
          />
        </div>

        <!-- Burndown lite -->
        <div class="ml-16 px-4 py-3 bg-muted/30 rounded-lg">
          <div class="flex:row-md flex:center-y justify-between mb-2">
            <span class="text-xs text-muted-foreground">Progress</span>
            <span class="text-xs text-muted-foreground">
              {{ activeSprint.completedItemCount }}/{{ activeSprint.itemCount }} done
            </span>
          </div>
          <div class="h-1.5 rounded-full bg-muted mb-2">
            <div
              class="h-full rounded-full bg-primary/40 transition-all"
              :style="{ width: `${burndownProgress(activeSprint)}%` }"
            />
          </div>
          <div class="flex:row gap-2 mt-2">
            <div class="flex:col items-center gap-1 flex-1">
              <div class="text-xs text-muted-foreground">Scope</div>
              <div class="text-sm font-medium">{{ activeSprint.itemCount }}</div>
            </div>
            <div class="flex:col items-center gap-1 flex-1">
              <div class="text-xs text-muted-foreground">Done</div>
              <div class="text-sm font-medium text-primary">{{ activeSprint.completedItemCount }}</div>
            </div>
          </div>
        </div>
        <Separator />
      </div>

      <div v-else-if="sprints.length === 0" class="flex:col flex:center h-48 text-muted-foreground">
        <p class="text-sm">No active sprint.</p>
        <p class="text-xs text-muted-foreground mt-1">Open sprint planning from a project to get started.</p>
      </div>

      <!-- Completed sprints -->
      <Collapsible v-if="completedSprints.length > 0" default-open>
        <CollapsibleTrigger as-child>
          <Button variant="ghost" size="sm" class="text-muted-foreground mb-1">
            <CheckCircleIcon class="size-4 mr-1" />
            Completed ({{ completedSprints.length }})
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div
            v-for="sprint in completedSprints"
            :key="sprint.id"
            class="flex:row-md flex:center-y py-2.5 px-2 rounded-lg hover:bg-muted/50 cursor-pointer group"
            @click="openReview(sprint)"
          >
            <div class="text-xs text-muted-foreground w-14 shrink-0">
              {{ sprintDateLabel(sprint) }}
            </div>
            <div class="w-2 h-2 rounded-full bg-green-500/60 shrink-0" />
            <div class="font-medium text-sm flex-1 text-muted-foreground">{{ sprint.name }}</div>
            <Badge variant="outline" class="text-xs text-green-600">Completed</Badge>
            <div class="text-xs text-muted-foreground ml-4">
              {{ successPercent(sprint) }}% · {{ sprint.completedItemCount }}/{{ sprint.itemCount }} done
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>

    <!-- Sprint review drawer -->
    <SprintReviewDrawer
      v-if="reviewSprintId !== null"
      :open="reviewDrawerOpen"
      :sprint-id="reviewSprintId"
      :workspace-id="workspaceId"
      :team-id="teamId"
      @update:open="
        reviewDrawerOpen = $event;
        if (!$event) closeReview();
      "
    />
  </div>
</template>
