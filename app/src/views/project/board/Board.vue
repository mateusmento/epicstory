<script lang="ts" setup>
import { computed, onMounted, onUnmounted, watch } from "vue";
import { useDragAndDrop } from "@formkit/drag-and-drop/vue";
import { useIssues } from "@/domain/issues";
import type { Issue } from "@/domain/issues";
import { Icon } from "@/design-system/icons";
import { formatDistanceToNow } from "date-fns";
import { debounce } from "lodash";
import { useWebSockets } from "@/core/websockets";

const props = defineProps<{ projectId: string }>();

const { issues, fetchIssues, updateIssue } = useIssues();
const { websocket } = useWebSockets();

// Kanban columns configuration
const columns = {
  todo: { id: "todo", label: "To Do", status: "todo" },
  doing: { id: "doing", label: "In Progress", status: "doing" },
  done: { id: "done", label: "Done", status: "done" },
} as const;

// Group issues by status
const issuesByStatus = computed(() => {
  const grouped: Record<string, Issue[]> = {
    todo: [],
    doing: [],
    done: [],
  };

  issues.value.forEach((issue) => {
    const status = issue.status || "todo";
    if (grouped[status]) {
      grouped[status].push(issue);
    } else {
      grouped.todo.push(issue);
    }
  });

  return grouped;
});

// Drag and drop setup for each column - initialize with empty arrays
const [todoRef, todoList] = useDragAndDrop([], {
  group: "kanban-issues",
  onTransfer({ targetParent, targetIndex }) {
    if (targetParent.el === todoRef.value) {
      const issue = todoList.value[targetIndex] as Issue | undefined;
      handleIssueMove(issue, "todo");
    }
  },
});

const [doingRef, doingList] = useDragAndDrop([], {
  group: "kanban-issues",
  onTransfer({ targetParent, targetIndex }) {
    if (targetParent.el === doingRef.value) {
      const issue = doingList.value[targetIndex] as Issue | undefined;
      handleIssueMove(issue, "doing");
    }
  },
});

const [doneRef, doneList] = useDragAndDrop([], {
  group: "kanban-issues",
  onTransfer({ targetParent, targetIndex }) {
    if (targetParent.el === doneRef.value) {
      const issue = doneList.value[targetIndex] as Issue | undefined;
      handleIssueMove(issue, "done");
    }
  },
});

// Update the drag-and-drop lists when issues change
watch(
  issuesByStatus,
  (newStatuses) => {
    todoList.value = [...newStatuses.todo] as any;
    doingList.value = [...newStatuses.doing] as any;
    doneList.value = [...newStatuses.done] as any;
  },
  { immediate: true, deep: true },
);

// Handle incoming issue updates from WebSocket
function onIssueUpdated({ issue, projectId }: { issue: Issue; projectId: number }) {
  if (projectId !== +props.projectId) return;

  const index = issues.value.findIndex((i) => i.id === issue.id);
  if (index >= 0) {
    // Update existing issue
    issues.value[index] = issue;
  } else {
    // Add new issue if it doesn't exist (in case it was created elsewhere)
    issues.value.push(issue);
  }
}

// Subscribe to project WebSocket room
function subscribeProject() {
  if (!websocket) return;

  websocket.emit("subscribe-project", {
    projectId: +props.projectId,
  });

  websocket.off("issue-updated", onIssueUpdated);
  websocket.on("issue-updated", onIssueUpdated);
}

// Unsubscribe from project WebSocket room
function unsubscribeProject() {
  if (!websocket) return;

  websocket.emit("unsubscribe-project", {
    projectId: +props.projectId,
  });

  websocket.off("issue-updated", onIssueUpdated);
}

// Fetch issues on mount
onMounted(async () => {
  await fetchIssues({
    projectId: +props.projectId,
    page: 0,
    count: 1000, // Get all issues for the board
    orderBy: "createdAt",
    order: "asc",
  });

  subscribeProject();
});

onUnmounted(() => {
  unsubscribeProject();
});

// Debounced update to avoid too many API calls
const debouncedUpdateIssue = debounce(async (issueId: number, status: string) => {
  await updateIssue(issueId, { status });
}, 300);

function handleIssueMove(issue: Issue | undefined, newStatus: string) {
  if (!issue || issue.status === newStatus) return;
  debouncedUpdateIssue(issue.id, newStatus);
}

function getPriorityColor(priority: number) {
  if (priority >= 3) return "bg-red-100 text-red-700 border-red-300";
  if (priority >= 2) return "bg-orange-100 text-orange-700 border-orange-300";
  if (priority >= 1) return "bg-yellow-100 text-yellow-700 border-yellow-300";
  return "bg-gray-100 text-gray-700 border-gray-300";
}

function getStatusColor(status: string) {
  if (status === "doing") return "bg-blue-100 text-blue-700 border-blue-300";
  if (status === "done") return "bg-green-100 text-green-700 border-green-300";
  return "bg-gray-100 text-gray-700 border-gray-300";
}

function getStatusLabel(status: string) {
  if (status === "doing") return "In Progress";
  if (status === "done") return "Done";
  return "To Do";
}

function formatDate(date: string | null | undefined) {
  if (!date) return null;
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
</script>

<template>
  <div class="flex:row-xl h-full overflow-x-auto p-4 gap-4">
    <div class="flex:col-lg flex-shrink-0 w-80">
      <!-- Column Header -->
      <div class="flex:row-md flex:center-y mb-3">
        <h3 class="text-sm font-semibold text-foreground">{{ columns.todo.label }}</h3>
        <span class="ml-2 text-xs text-secondary-foreground bg-secondary px-2 py-1 rounded-full">
          {{ issuesByStatus[columns.todo.status]?.length || 0 }}
        </span>
      </div>

      <!-- Column Content -->
      <div
        ref="todoRef"
        id="todo"
        class="flex:col-lg flex-1 min-h-0 bg-secondary/30 rounded-lg p-3 gap-3 overflow-y-auto"
      >
        <div
          v-for="issue in todoList"
          :key="(issue as Issue).id"
          class="flex:col-md bg-white rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-move"
        >
          <!-- Issue Title -->
          <div class="font-medium text-sm text-foreground line-clamp-2">
            {{ (issue as Issue).title || "Untitled Issue" }}
          </div>

          <!-- Status Badge -->
          <div class="mt-2">
            <span
              :class="[
                'text-xs px-2 py-0.5 rounded border font-medium',
                getStatusColor((issue as Issue).status),
              ]"
            >
              {{ getStatusLabel((issue as Issue).status) }}
            </span>
          </div>

          <!-- Issue Description (if exists) -->
          <div
            v-if="(issue as Issue).description"
            class="text-xs text-secondary-foreground line-clamp-2 mt-2"
          >
            {{ (issue as Issue).description }}
          </div>

          <!-- Issue Meta -->
          <div class="flex:row-md flex:center-y mt-3 gap-2 flex-wrap">
            <!-- Priority Badge -->
            <span
              v-if="(issue as Issue).priority > 0"
              :class="['text-xs px-2 py-0.5 rounded border', getPriorityColor((issue as Issue).priority)]"
            >
              P{{ (issue as Issue).priority }}
            </span>

            <!-- Due Date -->
            <span
              v-if="(issue as Issue).dueDate"
              class="text-xs text-secondary-foreground flex:row-md flex:center-y gap-1"
            >
              <Icon name="bi-calendar" class="w-3 h-3" />
              {{ formatDate((issue as Issue).dueDate) }}
            </span>

            <!-- Assignees -->
            <div v-if="(issue as Issue).assignees?.length" class="flex:row-md ml-auto">
              <div
                v-for="(assignee, index) in (issue as Issue).assignees.slice(0, 5)"
                :key="assignee.id"
                :class="[
                  'w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary border-2 border-white overflow-hidden',
                  index > 0 && '-ml-4',
                ]"
                :title="assignee.name"
              >
                <img
                  v-if="assignee.picture"
                  :src="assignee.picture"
                  :alt="assignee.name"
                  class="w-full h-full object-cover"
                />
                <span v-else>{{ assignee.name?.charAt(0).toUpperCase() || "?" }}</span>
              </div>
              <div
                v-if="(issue as Issue).assignees.length > 5"
                :class="[
                  'w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs text-secondary-foreground border-2 border-white',
                  (issue as Issue).assignees.length > 5 && '-ml-4',
                ]"
                :title="`+${(issue as Issue).assignees.length - 5} more`"
              >
                +{{ (issue as Issue).assignees.length - 5 }}
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="!todoList.length"
          class="flex items-center justify-center h-32 text-sm text-secondary-foreground"
        >
          No issues
        </div>
      </div>
    </div>
    <div class="flex:col-lg flex-shrink-0 w-80">
      <!-- Column Header -->
      <div class="flex:row-md flex:center-y mb-3">
        <h3 class="text-sm font-semibold text-foreground">{{ columns.doing.label }}</h3>
        <span class="ml-2 text-xs text-secondary-foreground bg-secondary px-2 py-1 rounded-full">
          {{ issuesByStatus[columns.doing.status]?.length || 0 }}
        </span>
      </div>

      <!-- Column Content -->

      <div
        ref="doingRef"
        id="doing"
        class="flex:col-lg flex-1 min-h-0 bg-secondary/30 rounded-lg p-3 gap-3 overflow-y-auto"
      >
        <div
          v-for="issue in doingList"
          :key="(issue as Issue).id"
          class="flex:col-md bg-white rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-move"
        >
          <!-- Issue Title -->
          <div class="font-medium text-sm text-foreground line-clamp-2">
            {{ (issue as Issue).title || "Untitled Issue" }}
          </div>

          <!-- Status Badge -->
          <div class="mt-2">
            <span
              :class="[
                'text-xs px-2 py-0.5 rounded border font-medium',
                getStatusColor((issue as Issue).status),
              ]"
            >
              {{ getStatusLabel((issue as Issue).status) }}
            </span>
          </div>

          <!-- Issue Description (if exists) -->
          <div
            v-if="(issue as Issue).description"
            class="text-xs text-secondary-foreground line-clamp-2 mt-2"
          >
            {{ (issue as Issue).description }}
          </div>

          <!-- Issue Meta -->
          <div class="flex:row-md flex:center-y mt-3 gap-2 flex-wrap">
            <!-- Priority Badge -->
            <span
              v-if="(issue as Issue).priority > 0"
              :class="['text-xs px-2 py-0.5 rounded border', getPriorityColor((issue as Issue).priority)]"
            >
              P{{ (issue as Issue).priority }}
            </span>

            <!-- Due Date -->
            <span
              v-if="(issue as Issue).dueDate"
              class="text-xs text-secondary-foreground flex:row-md flex:center-y gap-1"
            >
              <Icon name="bi-calendar" class="w-3 h-3" />
              {{ formatDate((issue as Issue).dueDate) }}
            </span>

            <!-- Assignees -->
            <div v-if="(issue as Issue).assignees?.length" class="flex:row-md ml-auto">
              <div
                v-for="(assignee, index) in (issue as Issue).assignees.slice(0, 5)"
                :key="assignee.id"
                :class="[
                  'w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary border-2 border-white overflow-hidden',
                  index > 0 && '-ml-4',
                ]"
                :title="assignee.name"
              >
                <img
                  v-if="assignee.picture"
                  :src="assignee.picture"
                  :alt="assignee.name"
                  class="w-full h-full object-cover"
                />
                <span v-else>{{ assignee.name?.charAt(0).toUpperCase() || "?" }}</span>
              </div>
              <div
                v-if="(issue as Issue).assignees.length > 5"
                :class="[
                  'w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs text-secondary-foreground border-2 border-white',
                  (issue as Issue).assignees.length > 5 && '-ml-4',
                ]"
                :title="`+${(issue as Issue).assignees.length - 5} more`"
              >
                +{{ (issue as Issue).assignees.length - 5 }}
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="!doingList.length"
          class="flex items-center justify-center h-32 text-sm text-secondary-foreground"
        >
          No issues
        </div>
      </div>
    </div>
    <div class="flex:col-lg flex-shrink-0 w-80">
      <!-- Column Header -->
      <div class="flex:row-md flex:center-y mb-3">
        <h3 class="text-sm font-semibold text-foreground">{{ columns.done.label }}</h3>
        <span class="ml-2 text-xs text-secondary-foreground bg-secondary px-2 py-1 rounded-full">
          {{ issuesByStatus[columns.done.status]?.length || 0 }}
        </span>
      </div>

      <!-- Column Content -->

      <div
        ref="doneRef"
        id="done"
        class="flex:col-lg flex-1 min-h-0 bg-secondary/30 rounded-lg p-3 gap-3 overflow-y-auto"
      >
        <div
          v-for="issue in doneList"
          :key="(issue as Issue).id"
          class="flex:col-md bg-white rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-move"
        >
          <!-- Issue Title -->
          <div class="font-medium text-sm text-foreground line-clamp-2">
            {{ (issue as Issue).title || "Untitled Issue" }}
          </div>

          <!-- Status Badge -->
          <div class="mt-2">
            <span
              :class="[
                'text-xs px-2 py-0.5 rounded border font-medium',
                getStatusColor((issue as Issue).status),
              ]"
            >
              {{ getStatusLabel((issue as Issue).status) }}
            </span>
          </div>

          <!-- Issue Description (if exists) -->
          <div
            v-if="(issue as Issue).description"
            class="text-xs text-secondary-foreground line-clamp-2 mt-2"
          >
            {{ (issue as Issue).description }}
          </div>

          <!-- Issue Meta -->
          <div class="flex:row-md flex:center-y mt-3 gap-2 flex-wrap">
            <!-- Priority Badge -->
            <span
              v-if="(issue as Issue).priority > 0"
              :class="['text-xs px-2 py-0.5 rounded border', getPriorityColor((issue as Issue).priority)]"
            >
              P{{ (issue as Issue).priority }}
            </span>

            <!-- Due Date -->
            <span
              v-if="(issue as Issue).dueDate"
              class="text-xs text-secondary-foreground flex:row-md flex:center-y gap-1"
            >
              <Icon name="bi-calendar" class="w-3 h-3" />
              {{ formatDate((issue as Issue).dueDate) }}
            </span>

            <!-- Assignees -->
            <div v-if="(issue as Issue).assignees?.length" class="flex:row-md ml-auto">
              <div
                v-for="(assignee, index) in (issue as Issue).assignees.slice(0, 5)"
                :key="assignee.id"
                :class="[
                  'w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary border-2 border-white overflow-hidden',
                  index > 0 && '-ml-4',
                ]"
                :title="assignee.name"
              >
                <img
                  v-if="assignee.picture"
                  :src="assignee.picture"
                  :alt="assignee.name"
                  class="w-full h-full object-cover"
                />
                <span v-else>{{ assignee.name?.charAt(0).toUpperCase() || "?" }}</span>
              </div>
              <div
                v-if="(issue as Issue).assignees.length > 5"
                :class="[
                  'w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs text-secondary-foreground border-2 border-white',
                  (issue as Issue).assignees.length > 5 && '-ml-4',
                ]"
                :title="`+${(issue as Issue).assignees.length - 5} more`"
              >
                +{{ (issue as Issue).assignees.length - 5 }}
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="!doneList.length"
          class="flex items-center justify-center h-32 text-sm text-secondary-foreground"
        >
          No issues
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-clamp: 2;
}
</style>
