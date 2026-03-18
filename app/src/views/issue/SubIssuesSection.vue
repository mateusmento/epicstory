<script setup lang="ts">
import { useDependency } from "@/core/dependency-injection";
import { BacklogItemApi } from "@/domain/backlog";
import type { Issue } from "@/domain/issues";
import { IssueApi } from "@/domain/issues";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import SubIssueRow from "./sub-issues/SubIssueRow.vue";
import SubIssuesCreateRow from "./sub-issues/SubIssuesCreateRow.vue";
import SubIssuesHeader from "./sub-issues/SubIssuesHeader.vue";

const props = defineProps<{
  workspaceId: string;
  projectId: string;
  parentIssueId: number;
  subIssues: Issue[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "changed"): void;
}>();

const router = useRouter();
const issueApi = useDependency(IssueApi);
const backlogItemApi = useDependency(BacklogItemApi);

const isCollapsed = ref(false);
const newTitle = ref("");
const isCreating = ref(false);

const doneCount = computed(() => props.subIssues.filter((s) => (s.status ?? "") === "done").length);

function openSubIssue(subIssueId: number) {
  router.push(`/${props.workspaceId}/project/${props.projectId}/issue/${subIssueId}`);
}

async function toggleDone(sub: Issue) {
  const nextStatus = sub.status === "done" ? "todo" : "done";
  await issueApi.updateIssue(sub.id, { status: nextStatus });
  emit("changed");
}

async function removeSubIssue(subIssueId: number) {
  // Backend remove-issue command also removes any backlog item that might exist.
  await issueApi.removeIssue(subIssueId);
  emit("changed");
}

async function createSubIssue() {
  const title = newTitle.value.trim();
  if (!title) return;
  if (!props.parentIssueId) return;
  if (isCreating.value) return;
  isCreating.value = true;
  try {
    // Use backlog-item create endpoint so the sub-issue is created as a backlog item + issue.
    await backlogItemApi.create(+props.projectId, {
      title,
      parentIssueId: props.parentIssueId,
    });
    newTitle.value = "";
    emit("changed");
  } finally {
    isCreating.value = false;
  }
}

function focusNewInput() {
  queueMicrotask(() => {
    const el = document.getElementById("new-sub-issue") as HTMLInputElement | null;
    el?.focus?.();
  });
}
</script>

<template>
  <div class="flex:col-md mt-2">
    <SubIssuesHeader
      :collapsed="isCollapsed"
      :done-count="doneCount"
      :total-count="subIssues.length"
      :disabled="disabled"
      @toggle="isCollapsed = !isCollapsed"
      @add="
        () => {
          isCollapsed = false;
          focusNewInput();
        }
      "
    />

    <div v-show="!isCollapsed" class="mt-2">
      <div class="rounded-xl border bg-white overflow-hidden">
        <SubIssuesCreateRow
          v-model="newTitle"
          input-id="new-sub-issue"
          :disabled="disabled"
          :is-creating="isCreating"
          @create="createSubIssue"
        />

        <!-- List -->
        <div class="divide-y">
          <SubIssueRow
            v-for="sub in subIssues"
            :key="sub.id"
            :sub="sub"
            :disabled="disabled"
            @open="openSubIssue"
            @toggle-done="toggleDone"
            @remove="removeSubIssue"
          />

          <div v-if="subIssues.length === 0" class="px-3 py-4 text-sm text-muted-foreground">
            No sub-issues yet
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
