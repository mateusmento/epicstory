<script lang="ts" setup>
import { Icon } from "@/design-system/icons";
import { useNotifications } from "@/domain/notifications";
import { useRoute, useRouter } from "vue-router";
import type { Notification } from "@/domain/notifications/types/notification.types";
import type {
  MentionNotificationPayload,
  ReplyNotificationPayload,
  DirectMessageNotificationPayload,
  IssueDueDateNotificationPayload,
  IssueAssignedNotificationPayload,
} from "@/domain/notifications/types/notification.types";
import MentionNotification from "./notifications/MentionNotification.vue";
import ReplyNotification from "./notifications/ReplyNotification.vue";
import MessageNotification from "./notifications/MessageNotification.vue";
import DueDateNotification from "./notifications/DueDateNotification.vue";
import IssueAssignedNotification from "./notifications/IssueAssignedNotification.vue";

const { notifications, markAsSeen } = useNotifications({ limit: 100 });
const router = useRouter();
const route = useRoute();

async function openNotification(notification: Notification) {
  await markAsSeen(notification.id);
  const workspaceId = route.params.workspaceId as string | undefined;

  if (notification.type === "mention" || notification.type === "direct_message" || notification.type === "reply") {
    const payload = notification.payload as MentionNotificationPayload | DirectMessageNotificationPayload | ReplyNotificationPayload;
    if (payload?.channel?.id && workspaceId) {
      router.push({ name: "channel", params: { workspaceId, channelId: String(payload.channel.id) } });
    }
    return;
  }

  if (notification.type === "issue_assigned") {
    const payload = notification.payload as IssueAssignedNotificationPayload;
    if (workspaceId && payload?.issue?.projectId && payload?.issue?.id) {
      router.push({
        name: "project-issue",
        params: {
          workspaceId,
          projectId: String(payload.issue.projectId),
          issueId: String(payload.issue.id),
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
  }
}
</script>

<template>
  <div class="flex:col w-96 h-full">
    <div class="flex:row-md flex:center-y p-4 border-b">
      <Icon name="oi-inbox" />
      <div class="text-lg font-semibold">Inbox</div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="notifications.length === 0" class="flex:col-md flex:center p-8 text-center">
        <Icon name="oi-inbox" class="text-4xl text-secondary-foreground/50" />
        <div class="text-sm text-secondary-foreground">No notifications yet</div>
      </div>

      <div v-else class="flex:col">
        <div v-for="notification in notifications" :key="notification.id" role="button" tabindex="0"
          @click="openNotification(notification)" @keydown.enter.prevent="openNotification(notification)"
          class="flex:col-md p-4 border-b hover:bg-secondary transition-colors cursor-pointer"
          :class="notification.seen ? 'opacity-70' : 'bg-secondary/10'">
          <MentionNotification v-if="notification.type === 'mention'"
            :payload="notification.payload as MentionNotificationPayload" :createdAt="notification.createdAt" />
          <ReplyNotification v-else-if="notification.type === 'reply'"
            :payload="notification.payload as ReplyNotificationPayload" :createdAt="notification.createdAt" />
          <MessageNotification v-else-if="notification.type === 'direct_message'"
            :payload="notification.payload as DirectMessageNotificationPayload" :createdAt="notification.createdAt" />
          <DueDateNotification v-else-if="notification.type === 'issue_due_date'"
            :payload="notification.payload as IssueDueDateNotificationPayload" :createdAt="notification.createdAt" />
          <IssueAssignedNotification v-else-if="notification.type === 'issue_assigned'"
            :payload="notification.payload as IssueAssignedNotificationPayload" :createdAt="notification.createdAt" />
          <div v-else class="text-sm text-secondary-foreground">
            Unknown notification type: {{ notification.type }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
