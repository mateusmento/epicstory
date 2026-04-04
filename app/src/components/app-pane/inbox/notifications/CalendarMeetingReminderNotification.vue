<script lang="tsx" setup>
import { formatDistanceToNow } from "date-fns";
import { Video } from "lucide-vue-next";
import { computed } from "vue";
import { resolveCalendarReminderStartsInLabel } from "@/domain/notifications/event-starts-in";
import type { CalendarMeetingReminderNotificationPayload } from "@/domain/notifications/types/notification.types";

const props = defineProps<{
  payload: CalendarMeetingReminderNotificationPayload;
  createdAt: string;
}>();

const when = (() => {
  const d = new Date(props.payload.occurrenceAt);
  return Number.isNaN(d.getTime()) ? null : d;
})();

const startsIn = computed(() =>
  resolveCalendarReminderStartsInLabel(
    props.payload.notifyMinutesBefore,
    props.payload.occurrenceAt,
  ),
);
</script>

<template>
  <div class="flex:row-md flex:center-y">
    <div class="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
      <Video class="w-4 h-4 text-foreground/70" />
    </div>

    <div class="flex:col min-w-0 flex-1">
      <div class="text-sm font-medium truncate">
        {{ payload.title }} is about to start {{ startsIn }}
      </div>
      <div class="text-xs text-secondary-foreground truncate">
        <span v-if="when">Starts {{ when.toLocaleString() }}</span>
        <span v-else>Start time unavailable</span>
        · {{ formatDistanceToNow(new Date(createdAt), { addSuffix: true }) }}
      </div>
    </div>
  </div>
</template>
