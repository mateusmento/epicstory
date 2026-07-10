<script setup lang="ts">
import { useDependency } from "@/core/dependency-injection";
import { BacklogApi, IssueApi } from "@epicstory/api-client";
import type { IIssue } from "@epicstory/contracts";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { IssueContextMenu } from "@/containers/issue";
import IssueDeleteDialog from "@/presentationals/issue/IssueDeleteDialog.vue";
import SubIssueRow from "@/presentationals/issue/sub-issues/SubIssueRow.vue";
import SubIssuesCreateRow from "@/presentationals/issue/sub-issues/SubIssuesCreateRow.vue";
import SubIssuesHeader from "@/presentationals/issue/sub-issues/SubIssuesHeader.vue";

const props = defineProps<{
  workspaceId: string;
  projectId: string;
  parentIssueId: number;
  subIssues: IIssue[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "changed"): void;
}>();

const router = useRouter();
const issueApi = useDependency(IssueApi);
const backlogItemApi = useDependency(BacklogApi);

const isCollapsed = ref(false);
const newTitle = ref("");
const isCreating = ref(false);
const deleteOpen = ref(false);
const deletingSub = ref<IIssue | null>(null);
const nestedCount = ref(0);

const doneCount = computed(() => props.subIssues.filter((s) => (s.status ?? "") === "done").length);

function openSubIssue(subIssueId: number) {
  router.push(`/${props.workspaceId}/project/${props.projectId}/issue/${subIssueId}`);
}

async function toggleDone(sub: IIssue) {
  const nextStatus = sub.status === "done" ? "todo" : "done";
  await issueApi.updateIssue(sub.id, { status: nextStatus });
  emit("changed");
}

function openDeleteDialog(subIssueId: number) {
  const sub = props.subIssues.find((s) => s.id === subIssueId) ?? null;
  deletingSub.value = sub;
  nestedCount.value = sub?.subIssues?.length ?? 0;
  deleteOpen.value = true;
}

watch(deleteOpen, async (open) => {
  if (!open || !deletingSub.value) return;
  try {
    const { count } = await issueApi.countIssueDescendants(deletingSub.value.id);
    nestedCount.value = count;
  } catch {
    // Keep direct-child fallback when the count endpoint fails.
  }
});

async function confirmRemoveSubIssue(payload: { deleteSubIssues: boolean }) {
  if (!deletingSub.value) return;
  await issueApi.removeIssue(deletingSub.value.id, payload);
  deletingSub.value = null;
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

    <div v-show="!isCollapsed" class="flex:col-md mt-2 rounded-xl bg-card">
      <SubIssuesCreateRow
        v-model="newTitle"
        input-id="new-sub-issue"
        :disabled="disabled"
        :is-creating="isCreating"
        @create="createSubIssue"
      />

      <!-- List -->
      <IssueContextMenu v-for="sub in subIssues" :key="sub.id" :issue="sub" :disabled="disabled">
        <SubIssueRow
          :sub="sub"
          :disabled="disabled"
          @open="openSubIssue"
          @toggle-done="toggleDone"
          @remove="openDeleteDialog"
        />
      </IssueContextMenu>

      <div v-if="subIssues.length === 0" class="px-3 py-4 text-sm text-muted-foreground">
        No sub-issues yet
      </div>
    </div>

    <IssueDeleteDialog
      :open="deleteOpen"
      :title="deletingSub?.title ?? ''"
      :nested-count="nestedCount"
      :disabled="disabled"
      @update:open="deleteOpen = $event"
      @confirm="confirmRemoveSubIssue"
    />
  </div>
</template>
