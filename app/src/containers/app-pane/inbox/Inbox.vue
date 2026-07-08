<script lang="ts" setup>
import { Icon } from "@/design-system/icons";
import { ScrollArea, Separator } from "@/design-system";
import { useAuth } from "@/domain/auth";
import { useNotifications } from "@/domain/notifications";
import { InboxNotificationRow } from "@/presentationals/inbox";
import type {
  CalendarEventReminderNotificationPayload,
  CalendarMeetingReminderNotificationPayload,
  DirectMessageNotificationPayload,
  IssueAssignedNotificationPayload,
  IssueDueDateNotificationPayload,
  MentionNotificationPayload,
  MessageReactionNotificationPayload,
  INotification,
  ReplyNotificationPayload,
  ReplyReactionNotificationPayload,
} from "@epicstory/contracts";
import { useVirtualizer } from "@tanstack/vue-virtual";
import type { VNodeRef } from "vue";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const { user } = useAuth();
const { notifications, isLoading, isLoadingMore, hasMore, markAsSeen, fetchMoreNotifications } =
  useNotifications();

const router = useRouter();
const route = useRoute();
const scrollAreaRef = ref<InstanceType<typeof ScrollArea> | null>(null);

const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: notifications.value.length,
    getScrollElement: () => scrollAreaRef.value?.getScrollElement() ?? null,
    estimateSize: () => 96,
    overscan: 6,
    getItemKey: (index: number) => notifications.value[index]?.id ?? index,
  })),
);

const measureNotificationRow: VNodeRef = (el) => {
  rowVirtualizer.value.measureElement(el as HTMLElement | null);
};

function onReachedBottom() {
  if (!hasMore.value || isLoadingMore.value || isLoading.value) return;
  fetchMoreNotifications();
}

async function openNotification(notification: INotification) {
  await markAsSeen(notification.id);
  const workspaceId = route.params.workspaceId as string | undefined;

  if (
    notification.type === "mention" ||
    notification.type === "direct_message" ||
    notification.type === "reply"
  ) {
    const payload = notification.payload as
      | MentionNotificationPayload
      | DirectMessageNotificationPayload
      | ReplyNotificationPayload;
    if (payload?.channel?.id && workspaceId) {
      router.push({ name: "channel", params: { workspaceId, channelId: String(payload.channel.id) } });
    }
    return;
  }

  if (notification.type === "message_reaction" || notification.type === "reply_reaction") {
    const payload = notification.payload as
      | MessageReactionNotificationPayload
      | ReplyReactionNotificationPayload;
    if (payload?.channelId && workspaceId) {
      router.push({ name: "channel", params: { workspaceId, channelId: String(payload.channelId) } });
    }
    return;
  }

  if (notification.type === "issue_assigned") {
    const payload = notification.payload as IssueAssignedNotificationPayload;
    if (workspaceId && payload?.projectId && payload?.issueId) {
      router.push({
        name: "project-issue",
        params: {
          workspaceId,
          projectId: String(payload.projectId),
          issueId: String(payload.issueId),
        },
      });
    }
    return;
  }

  if (notification.type === "issue_due_date") {
    const payload = notification.payload as IssueDueDateNotificationPayload & { projectId?: number };
    if (workspaceId && payload?.projectId && payload?.issueId) {
      router.push({
        name: "project-issue",
        params: {
          workspaceId,
          projectId: String(payload.projectId),
          issueId: String(payload.issueId),
        },
      });
    }
    return;
  }

  if (notification.type === "calendar_meeting_reminder") {
    if (workspaceId) {
      router.push({ name: "schedule", params: { workspaceId } });
    }
    return;
  }

  if (notification.type === "calendar_event_reminder") {
    const payload = notification.payload as CalendarEventReminderNotificationPayload;
    if (workspaceId) {
      router.push({
        name: "schedule",
        params: { workspaceId },
        query: {
          calendarEventId: payload?.calendarEventId,
          occurrenceAt: payload?.occurrenceAt,
        },
      });
    }
    return;
  }

  if (notification.type === "sprint_completed") {
    const payload = notification.payload;
    if (workspaceId) {
      router.push({
        name: "team",
        params: { workspaceId, teamId: String(payload.teamId) },
        query: { reviewSprint: String(payload.sprintId) },
      });
    }
  }
}
</script>

<template>
  <div class="flex:col w-96 h-full">
    <div class="flex:row-md flex:center-y p-4 h-10">
      <Icon name="oi-inbox" />
      <div class="font-medium text-sm">Inbox</div>
    </div>

    <Separator />

    <ScrollArea ref="scrollAreaRef" class="flex-1 min-h-0" @reached-bottom="onReachedBottom">
      <div class="!block">
        <div v-if="isLoading && notifications.length === 0" class="flex:col-md flex:center p-8 text-center">
          <div class="text-sm text-secondary-foreground">Loading notifications…</div>
        </div>

        <div v-else-if="notifications.length === 0" class="flex:col-md flex:center p-8 text-center">
          <Icon name="oi-inbox" class="text-4xl text-secondary-foreground/50" />
          <div class="text-sm text-secondary-foreground">No notifications yet</div>
        </div>

        <div
          v-else
          :style="{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }"
        >
          <div
            v-for="virtualRow in rowVirtualizer.getVirtualItems()"
            :key="String(virtualRow.key)"
            :data-index="virtualRow.index"
            :ref="measureNotificationRow"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }"
          >
            <InboxNotificationRow
              :notification="notifications[virtualRow.index]!"
              :me-id="user?.id ?? null"
              @select="openNotification"
            />
          </div>
        </div>

        <div v-if="isLoadingMore" class="py-3 text-center text-xs text-secondary-foreground border-t">
          Loading more…
        </div>
        <div
          v-else-if="notifications.length > 0 && !hasMore"
          class="py-3 text-center text-xs text-secondary-foreground border-t"
        >
          End of notifications
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
