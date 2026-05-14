<script lang="tsx" setup>
import { formatDistanceToNow } from "date-fns";
import { Video } from "lucide-vue-next";
import { computed } from "vue";
import { resolveCalendarReminderStartsInLabel } from "@/domain/notifications";
import type { CalendarMeetingReminderNotificationPayload } from "@/domain/notifications";
import { formatTime } from "@/utils";

const props = defineProps<{
  payload: CalendarMeetingReminderNotificationPayload;
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
  <div class="flex:col-md flex:center-y flex-1 font-dmSans">
    <div class="flex:row-md flex:center-y items-baseline text-secondary-foreground">
      <Video class="size-4" />
      <div class="text-sm">
        Meeting starts in <span class="text-zinc-700 font-medium">{{ startsIn }}</span>
      </div>
      <div class="ml-auto text-xs">{{ formatTime(createdAt) }}</div>
    </div>

    <div class="flex:row-2xl flex:center-y">
      <div class="size-10 rounded-full bg-secondary flex items-center justify-center">
        <Video class="size-4 text-foreground/70" />
      </div>

      <div class="flex:col-md min-w-0 flex-1">
        <div class="text-sm truncate font-lato">{{ payload.title }} is about to start {{ startsIn }}</div>
        <div class="text-xs text-secondary-foreground truncate">
          <span v-if="when">Starts {{ when.toLocaleString() }}</span>
          <span v-else>Start time unavailable</span>
          · {{ formatDistanceToNow(new Date(createdAt), { addSuffix: true }) }}
        </div>
      </div>
    </div>
  </div>
</template>
