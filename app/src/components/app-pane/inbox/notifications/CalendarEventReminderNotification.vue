<script lang="tsx" setup>
import { formatDate, formatDistanceToNow } from "date-fns";
import { Calendar } from "lucide-vue-next";
import { computed } from "vue";
import { resolveCalendarReminderStartsInLabel } from "@/domain/notifications/event-starts-in";
import type { CalendarEventReminderNotificationPayload } from "@/domain/notifications/types/notification.types";
import { formatTime } from "@/utils";

const props = defineProps<{
  payload: CalendarEventReminderNotificationPayload;
  createdAt: string;
}>();

const when = (() => {
  const d = new Date(props.payload.occurrenceAt);
  return Number.isNaN(d.getTime()) ? null : d;
})();

const startsIn = computed(() =>
  resolveCalendarReminderStartsInLabel(props.payload.notifyMinutesBefore, props.payload.occurrenceAt),
);
</script>

<template>
  <div class="flex:col-md flex:center-y flex-1">
    <div class="flex:row-md flex:center-y items-baseline text-secondary-foreground font-dmSans">
      <Calendar class="size-4" />
      <div class="text-sm">
        Event starts in <span class="text-zinc-700 font-medium">{{ startsIn }}</span>
      </div>
      <div class="ml-auto text-xs">{{ formatTime(createdAt) }}</div>
    </div>

    <div class="flex:row-2xl flex:center-y">
      <div class="size-10 rounded-full bg-secondary flex items-center justify-center">
        <Calendar class="size-4 text-foreground/70" />
      </div>

      <div class="flex:col min-w-0 flex-1 font-dmSans">
        <div class="text-sm truncate">{{ payload.title }}</div>
        <div class="text-xs text-secondary-foreground truncate">
          <span v-if="when"
            >Starts {{ formatDate(when, "MMM d, yyyy") }} ·
            {{ formatDistanceToNow(when, { addSuffix: true }) }}</span
          >
          <span v-else>Start time unavailable</span>
        </div>
      </div>
    </div>
  </div>
</template>
