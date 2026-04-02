<script lang="tsx" setup>
import { formatDistanceToNow } from "date-fns";
import { Calendar } from "lucide-vue-next";
import type { CalendarEventReminderNotificationPayload } from "@/domain/notifications/types/notification.types";

const props = defineProps<{
  payload: CalendarEventReminderNotificationPayload;
  createdAt: string;
}>();

const when = (() => {
  const d = new Date(props.payload.occurrenceAt);
  return Number.isNaN(d.getTime()) ? null : d;
})();
</script>

<template>
  <div class="flex:row-md flex:center-y">
    <div class="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
      <Calendar class="w-4 h-4 text-foreground/70" />
    </div>

    <div class="flex:col min-w-0 flex-1">
      <div class="text-sm font-medium truncate">
        Event reminder: {{ payload.title }}
      </div>
      <div class="text-xs text-secondary-foreground truncate">
        <span v-if="when">At {{ when.toLocaleString() }}</span>
        <span v-else>Coming soon</span>
        · {{ formatDistanceToNow(new Date(createdAt), { addSuffix: true }) }}
      </div>
    </div>
  </div>
</template>

