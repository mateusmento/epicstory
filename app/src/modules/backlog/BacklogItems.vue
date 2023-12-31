<script lang="ts" setup>
import type { Issue } from '@/lib/models/issue.model';
import { BacklogApi } from '@/lib/api/backlog.api';
import { computed, onMounted, ref } from 'vue';
import draggable from 'vuedraggable';
import AddBacklogItem from './components/AddBacklogItem.vue';
import BacklogItem from './components/BacklogItem.vue';
import * as issueMutations from './issue-mutations';
import { requestApi } from '@/lib/utils/api';
import type { User } from '@/lib/models/user.model';

const props = defineProps<{
  productId: number;
}>();

const backlogRepo = new BacklogApi();

const backlogItems = ref<Issue[]>([]);

onMounted(async () => {
  backlogItems.value = await backlogRepo.fetchBacklogItems(props.productId);
});

async function createBacklogItem(data: any) {
  let item = await requestApi(backlogRepo.createIssue(props.productId, data));
  backlogItems.value = [...backlogItems.value, item];
}

async function removeIssue(id: number) {
  await backlogRepo.removeIssue(id);
  backlogItems.value = backlogItems.value.filter((i) => i.id !== id);
}

const patchIssue = async (i: number, issue: Issue, e: Partial<Issue>) =>
  (backlogItems.value[i] = await issueMutations.patchIssue(issue, e));

const addAssignee = async (i: number, issue: Issue, e: User) =>
  (backlogItems.value[i] = await issueMutations.addAssignee(issue, e));

const removeAssignee = async (i: number, issue: Issue, e: User) =>
  (backlogItems.value[i] = await issueMutations.removeAssignee(issue, e));

function canMoveBacklogItemToSprint({ relatedContext }: any) {
  let dropzone = relatedContext.component.$attrs['data-dropzone'];
  // dropzone === undefined seems to happen when moving an item inside a dropzone
  return dropzone === undefined || dropzone === 'sprint';
}

function moveBacklogItem({ moved, added, removed }: any) {
  if (added) {
    const { id } = added.element;
    const item = { issueId: id, order: added.newIndex };
    backlogRepo.includeItem(props.productId, item);
  }

  if (removed) {
    backlogRepo.removeItem(props.productId, removed.element.id);
  }

  if (moved) {
    backlogRepo.moveItem(props.productId, moved.element.id, moved.newIndex);
  }
}
</script>

<template>
  <div class="backlog">
    <draggable
      class="backlog-items"
      v-model="backlogItems"
      item-key="id"
      tag="ul"
      handle=".draggable-handle"
      group="issues"
      :move="canMoveBacklogItemToSprint"
      @change="moveBacklogItem"
    >
      <template #item="{ element: issue, index: i }">
        <li>
          <BacklogItem
            :issue="issue"
            @patch="patchIssue(i, issue, $event)"
            @remove="removeIssue"
            @add-assignee="addAssignee(i, issue, $event)"
            @remove-assignee="removeAssignee(i, issue, $event)"
          />
        </li>
      </template>
    </draggable>

    <AddBacklogItem @created="createBacklogItem" />
  </div>
</template>

<style scoped>
.backlog {
  background: #f0f7ff;
  border-radius: 8px;
  padding: 5px;
}

.backlog-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
