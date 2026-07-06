<script setup lang="ts">
import { Button, ScrollArea } from "@/design-system";
import { useProjectSprint } from "@/domain/sprint";
import { ArrowRightIcon, TimerIcon } from "lucide-vue-next";
import { useRouter } from "vue-router";

const props = defineProps<{ workspaceId: string; projectId: string }>();

const router = useRouter();

const { teamId, loading, activeSprint, activeSprintItems, todoItems, doingItems, doneItems } =
  useProjectSprint(props);

function openIssue(issueId: number) {
  router.push(`/${props.workspaceId}/project/${props.projectId}/issue/${issueId}`);
}

const COLUMN_CLASSES = "flex:col gap-2 flex-shrink-0 w-80 min-w-80 rounded-xl bg-muted/40 p-3";
</script>

<template>
  <div class="flex:col h-full">
    <!-- No team assigned -->
    <div v-if="!loading && !teamId" class="flex:col flex:center h-64 gap-3 text-muted-foreground">
      <TimerIcon class="size-8" />
      <p class="text-sm">This project is not assigned to a team.</p>
      <p class="text-xs">Assign the project to a team to see sprint progress here.</p>
    </div>

    <!-- No active sprint -->
    <div
      v-else-if="!loading && teamId && !activeSprint"
      class="flex:col flex:center h-64 gap-3 text-muted-foreground"
    >
      <TimerIcon class="size-8" />
      <p class="text-sm">No active sprint for this team.</p>
      <Button variant="outline" size="sm" @click="router.push(`/${workspaceId}/team/${teamId}`)">
        Go to team sprints
        <ArrowRightIcon class="ml-1 size-4" />
      </Button>
    </div>

    <!-- Sprint board -->
    <template v-else-if="activeSprint">
      <div class="flex:row-md flex:center-y justify-between px-4 py-2 border-b border-border">
        <div>
          <span class="text-sm font-medium">{{ activeSprint.name }}</span>
          <span class="ml-2 text-xs text-muted-foreground">
            {{ activeSprintItems.length }} issues in this project
          </span>
        </div>
        <Button variant="outline" size="sm" @click="router.push(`/${workspaceId}/team/${teamId}/plan`)">
          Sprint plan
          <ArrowRightIcon class="ml-1 size-4" />
        </Button>
      </div>

      <ScrollArea class="flex-1">
        <div class="flex:row gap-4 p-4">
          <!-- Todo column -->
          <div :class="COLUMN_CLASSES">
            <div class="flex:row-md flex:center-y justify-between px-1 mb-1">
              <span class="text-sm font-semibold">To do</span>
              <span class="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                {{ todoItems.length }}
              </span>
            </div>
            <div
              v-for="item in todoItems"
              :key="item.id"
              class="bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow"
              @click="openIssue(item.issue.id)"
            >
              <div class="text-xs text-muted-foreground font-mono mb-1">
                {{ item.issue?.issueKey ?? `#${item.issue?.id}` }}
              </div>
              <div class="text-sm">{{ item.issue?.title }}</div>
            </div>
            <div v-if="todoItems.length === 0" class="text-xs text-center text-muted-foreground py-4">
              No issues
            </div>
          </div>

          <!-- Doing column -->
          <div :class="COLUMN_CLASSES">
            <div class="flex:row-md flex:center-y justify-between px-1 mb-1">
              <span class="text-sm font-semibold">In progress</span>
              <span class="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                {{ doingItems.length }}
              </span>
            </div>
            <div
              v-for="item in doingItems"
              :key="item.id"
              class="bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow"
              @click="openIssue(item.issue.id)"
            >
              <div class="text-xs text-muted-foreground font-mono mb-1">
                {{ item.issue?.issueKey ?? `#${item.issue?.id}` }}
              </div>
              <div class="text-sm">{{ item.issue?.title }}</div>
            </div>
            <div v-if="doingItems.length === 0" class="text-xs text-center text-muted-foreground py-4">
              No issues
            </div>
          </div>

          <!-- Done column -->
          <div :class="COLUMN_CLASSES">
            <div class="flex:row-md flex:center-y justify-between px-1 mb-1">
              <span class="text-sm font-semibold">Done</span>
              <span class="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                {{ doneItems.length }}
              </span>
            </div>
            <div
              v-for="item in doneItems"
              :key="item.id"
              class="bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow opacity-75"
              @click="openIssue(item.issue.id)"
            >
              <div class="text-xs text-muted-foreground font-mono mb-1">
                {{ item.issue?.issueKey ?? `#${item.issue?.id}` }}
              </div>
              <div class="text-sm line-through text-muted-foreground">{{ item.issue?.title }}</div>
            </div>
            <div v-if="doneItems.length === 0" class="text-xs text-center text-muted-foreground py-4">
              No issues
            </div>
          </div>
        </div>
      </ScrollArea>
    </template>
  </div>
</template>
