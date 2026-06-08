<script setup lang="ts">
import { IssueContextMenu, IssueLabelTags } from "@/containers/issue";
import IssueCardView from "@/presentationals/views/project/board/IssueCard.vue";
import type { IBacklogItem, IIssue } from "@epicstory/contracts";

defineProps<{ item: IBacklogItem }>();

const emit = defineEmits<{
  (e: "openIssue", issue: IIssue): void;
  (e: "add-label", id: number): void;
  (e: "remove-label", id: number): void;
}>();
</script>

<template>
  <IssueContextMenu :issue="item.issue">
    <IssueCardView :item="item" @open-issue="emit('openIssue', $event)">
      <template v-if="item.issue.labels?.length" #labels>
        <IssueLabelTags
          class="shrink-0"
          :disabled="!item.issue"
          :model-value="(item.issue?.labels ?? []).map((l) => l.id)"
          @add-label="emit('add-label', $event)"
          @remove-label="emit('remove-label', $event)"
        />
      </template>
    </IssueCardView>
  </IssueContextMenu>
</template>
