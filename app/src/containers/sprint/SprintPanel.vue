<script setup lang="ts">
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
} from "@/design-system";
import { useSprintPanel } from "@/domain/sprint";
import { burndownProgress, sprintDateLabel, successPercent } from "@/lib/sprint";
import SprintPlanItem from "@/presentationals/sprint/SprintPlanItem.vue";
import SprintZone from "@/presentationals/sprint/SprintZone.vue";
import type { CompleteSprintResult, ISprint } from "@epicstory/contracts";
import { CheckCircleIcon } from "lucide-vue-next";
import { ref } from "vue";
import CompleteSprintPopover from "./CompleteSprintPopover.vue";
import SprintReviewDrawer from "@/views/team/SprintReviewDrawer.vue";

const props = defineProps<{
  workspaceId: string;
  teamId: number;
}>();

const { currentSprint, upcomingSprint, completedSprints, getLocalItems, handleSprintDrop, onSprintAction } =
  useSprintPanel({ teamId: props.teamId });

const reviewSprintId = ref<number | null>(null);
const reviewDrawerOpen = ref(false);

function openReview(sprint: ISprint) {
  reviewSprintId.value = sprint.id;
  reviewDrawerOpen.value = true;
}

function closeReview() {
  reviewDrawerOpen.value = false;
}

function onSprintCompleted(result: CompleteSprintResult) {
  onSprintAction();
  openReview(result.sprint);
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0 overflow-hidden">
    <div class="px-4 py-3 border-b">
      <h2 class="text-sm font-semibold">Sprint Planning</h2>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-4">
      <!-- Current sprint -->
      <div v-if="currentSprint" class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-2 h-2 rounded-full bg-primary shrink-0" />
            <span class="text-sm font-medium truncate">{{ currentSprint.name }}</span>
            <Badge class="text-xs shrink-0">Current</Badge>
          </div>
          <CompleteSprintPopover :sprint="currentSprint" action="complete" @completed="onSprintCompleted" />
        </div>

        <!-- Date + progress -->
        <div class="text-xs text-muted-foreground">
          {{ sprintDateLabel(currentSprint) }}
          <span v-if="currentSprint.endsAt">
            –
            {{
              new Date(currentSprint.endsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
            }}
          </span>
        </div>
        <div class="h-1 rounded-full bg-muted">
          <div
            class="h-full rounded-full bg-primary/50 transition-all"
            :style="{ width: `${burndownProgress(currentSprint)}%` }"
          />
        </div>
        <div class="text-xs text-muted-foreground">
          {{ currentSprint.completedItemCount }}/{{ currentSprint.itemCount }} done
        </div>

        <!-- Sprint zone -->
        <SprintZone
          group="sprint-plan"
          :sprint-id="currentSprint.id"
          :source="getLocalItems(currentSprint.id)"
          @drop="({ payload }) => handleSprintDrop(currentSprint!.id, payload)"
        >
          <div class="flex flex-col divide-y border rounded-md min-h-[64px]">
            <SprintPlanItem
              v-for="item in getLocalItems(currentSprint.id)"
              :key="item.id"
              group="sprint-plan"
              :item-id="item.id"
              :source="getLocalItems(currentSprint.id)"
              :item-data="{
                sourceType: 'sprint',
                sprintId: currentSprint.id,
                issue: item.issue,
                issueId: item.issue?.id,
              }"
            >
              <div class="flex items-center gap-2 px-3 py-2">
                <div class="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                <span class="text-xs font-mono text-muted-foreground shrink-0">
                  {{ item.issue?.issueKey ?? `#${item.issue?.id}` }}
                </span>
                <span class="text-sm truncate flex-1">{{ item.issue?.title }}</span>
              </div>
            </SprintPlanItem>
            <div
              v-if="getLocalItems(currentSprint.id).length === 0"
              class="flex items-center justify-center py-6 text-xs text-muted-foreground"
            >
              Drag issues here
            </div>
          </div>
        </SprintZone>
      </div>

      <Separator v-if="currentSprint && upcomingSprint" />

      <!-- Upcoming sprint -->
      <div v-if="upcomingSprint" class="flex flex-col gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
          <span class="text-sm font-medium truncate">{{ upcomingSprint.name }}</span>
          <Badge variant="outline" class="text-xs shrink-0">Upcoming</Badge>
        </div>
        <div v-if="upcomingSprint.startsAt" class="text-xs text-muted-foreground">
          {{ sprintDateLabel(upcomingSprint) }}
          <span v-if="upcomingSprint.endsAt">
            –
            {{
              new Date(upcomingSprint.endsAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            }}
          </span>
        </div>

        <SprintZone
          group="sprint-plan"
          :sprint-id="upcomingSprint.id"
          :source="getLocalItems(upcomingSprint.id)"
          @drop="({ payload }) => handleSprintDrop(upcomingSprint!.id, payload)"
        >
          <div class="flex flex-col divide-y border rounded-md min-h-[64px]">
            <SprintPlanItem
              v-for="item in getLocalItems(upcomingSprint.id)"
              :key="item.id"
              group="sprint-plan"
              :item-id="item.id"
              :source="getLocalItems(upcomingSprint.id)"
              :item-data="{
                sourceType: 'sprint',
                sprintId: upcomingSprint.id,
                issue: item.issue,
                issueId: item.issue?.id,
              }"
            >
              <div class="flex items-center gap-2 px-3 py-2">
                <div class="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                <span class="text-xs font-mono text-muted-foreground shrink-0">
                  {{ item.issue?.issueKey ?? `#${item.issue?.id}` }}
                </span>
                <span class="text-sm truncate flex-1">{{ item.issue?.title }}</span>
              </div>
            </SprintPlanItem>
            <div
              v-if="getLocalItems(upcomingSprint.id).length === 0"
              class="flex items-center justify-center py-6 text-xs text-muted-foreground"
            >
              Drag issues here
            </div>
          </div>
        </SprintZone>
      </div>

      <!-- Completed sprints -->
      <Collapsible v-if="completedSprints.length > 0">
        <CollapsibleTrigger as-child>
          <Button variant="ghost" size="sm" class="text-muted-foreground w-full justify-start">
            <CheckCircleIcon class="size-4 mr-1" />
            Past sprints ({{ completedSprints.length }})
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div class="flex flex-col">
            <div
              v-for="sprint in completedSprints"
              :key="sprint.id"
              class="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
              @click="openReview(sprint)"
            >
              <div class="w-2 h-2 rounded-full bg-green-500/60 shrink-0" />
              <span class="flex-1 text-muted-foreground truncate">{{ sprint.name }}</span>
              <span class="text-xs text-muted-foreground shrink-0">{{ successPercent(sprint) }}%</span>
              <span class="text-xs text-muted-foreground shrink-0">{{ sprintDateLabel(sprint) }}</span>
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
      :team-id="String(teamId)"
      @update:open="
        reviewDrawerOpen = $event;
        if (!$event) closeReview();
      "
    />
  </div>
</template>
