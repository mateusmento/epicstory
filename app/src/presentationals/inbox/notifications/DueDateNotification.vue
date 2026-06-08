<script lang="tsx" setup>
import { IssueNotificationLabel } from "@/presentationals/issue";
import type { IssueDueDateNotificationPayload } from "@epicstory/contracts";
import { formatDate, formatDistanceToNow } from "date-fns";
import { Calendar } from "lucide-vue-next";

const props = defineProps<{
  payload: IssueDueDateNotificationPayload;
  createdAt: string;
}>();

const when = (() => {
  const d = new Date(props.payload.dueDate);
  return Number.isNaN(d.getTime()) ? null : d;
})();

function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
</script>

<template>
  <div class="flex:col-md flex:center-y flex-1">
    <div class="flex:row-md flex:center-y items-baseline text-secondary-foreground font-dmSans">
      <Calendar class="size-4 inline-block text-foreground/70" />
      <div class="text-sm">Issue due date reminder</div>
      <div class="ml-auto text-xs">{{ formatTime(createdAt) }}</div>
    </div>

    <div class="flex:row-2xl flex:center-y">
      <div class="size-10 rounded-full bg-secondary flex items-center justify-center">
        <Calendar class="size-4 text-foreground/70" />
      </div>

      <div class="flex:col min-w-0 flex-1">
        <IssueNotificationLabel
          :issue-key="payload.issueKey"
          :issue-id="payload.issueId"
          :title="payload.title"
        />

        <div class="flex:row-md flex:center-y text-sm text-secondary-foreground font-dmSans">
          <div class="text-xs text-secondary-foreground truncate">
            <span v-if="when"
              >Due {{ formatDate(when, "MMM d, yyyy") }} ·
              {{ formatDistanceToNow(when, { addSuffix: true }) }}</span
            >
            <span v-else>Due date unavailable</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
