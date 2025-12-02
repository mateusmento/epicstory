<script setup lang="ts">
import { Button, Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/design-system";
import { Icon, IconArrowDown, IconChannel, IconMention, IconSearch } from "@/design-system/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/design-system/ui/tabs";
import { useChannel, useMeeting, useSyncedChannels } from "@/domain/channels";
import CreateChannel from "./CreateChannel.vue";
import InboxMessage from "./InboxMessage.vue";
import { IconReplies, IconChats } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import { useWebSockets } from "@/core/websockets";
import { useDependency } from "@/core/dependency-injection";
import { useWorkspace } from "@/domain/workspace";
import { ChannelApi } from "@/domain/channels";
import { onMounted, onUnmounted, ref } from "vue";
import type { ReplyNotificationPayload } from "@/domain/notifications/types/notification.types";
import type { IMessage } from "@/domain/channels/types";
import ReplyNotification from "../inbox/notifications/ReplyNotification.vue";

type ReplyNotificationItem = {
  payload: ReplyNotificationPayload;
  createdAt: string;
};

const { channel: currentChannel } = useChannel();
const { channels } = useSyncedChannels();
const { currentMeeting, joinMeeting } = useMeeting();
const { workspace } = useWorkspace();

// Reply notifications
const { user } = useAuth();
const { websocket } = useWebSockets();
const channelApi = useDependency(ChannelApi);
const replyNotifications = ref<ReplyNotificationItem[]>([]);

async function onIncomingReply({
  message,
  parentMessageId,
  channelId,
}: {
  message: IMessage;
  parentMessageId: number;
  channelId: number;
}) {
  if (!user.value) return;

  // Don't show notifications for replies we sent ourselves
  if (message.senderId === user.value.id) return;

  try {
    // Fetch all messages from the channel to find the parent message
    const messages = await channelApi.findMessages(channelId);
    const parentMessage = messages.find((m) => m.id === parentMessageId);

    // Only show notification if the parent message belongs to the current user
    if (parentMessage && parentMessage.senderId === user.value.id) {
      // Find the channel to get its name
      const channel = channels.value.find((c) => c.id === channelId);
      const channelName = channel?.name || `channel-${channelId}`;

      // Create reply notification item
      const replyNotification: ReplyNotificationItem = {
        payload: {
          type: "reply",
          channelName,
          channelId,
          message: message.content,
          sender: {
            id: message.sender.id,
            name: message.sender.name,
            picture: message.sender.picture,
          },
        },
        createdAt: message.sentAt,
      };

      // Check if notification already exists (avoid duplicates)
      const exists = replyNotifications.value.some(
        (n) =>
          n.payload.channelId === channelId &&
          n.payload.sender.id === message.sender.id &&
          new Date(n.createdAt).getTime() === new Date(message.sentAt).getTime(),
      );
      if (!exists) {
        replyNotifications.value.unshift(replyNotification);
      }
    }
  } catch (error) {
    console.error("Failed to process incoming reply:", error);
  }
}

function subscribeReplies() {
  if (!user.value || !workspace.value) return;

  // Subscribe to messages to join channel rooms (needed to receive incoming-reply events)
  websocket.emit("subscribe-messages", {
    workspaceId: workspace.value.id,
  });

  websocket.off("incoming-reply", onIncomingReply);
  websocket.on("incoming-reply", onIncomingReply);
}

function unsubscribeReplies() {
  if (!user.value) return;

  websocket.off("incoming-reply", onIncomingReply);
}

onMounted(() => {
  subscribeReplies();
});

onUnmounted(() => {
  unsubscribeReplies();
});

const currentTab = ref("messages");
</script>

<template>
  <Tabs v-model="currentTab" class="flex:col h-full w-96" default-value="messages">
    <div class="p-4 flex:col-xl mx-auto">
      <div class="flex:row-auto flex:center-y mb-3">
        <div class="flex:row-sm flex:center-y text-lg text-foreground">
          <Icon name="fa-slack-hash" scale="1.2" />
          Channels
        </div>
        <div class="flex:row-md flex:center-y text-secondary-foreground text-sm">
          Recent
          <IconArrowDown />
        </div>
      </div>
      <div class="flex:row-md flex:center p-2 rounded-lg bg-background text-secondary-foreground text-sm">
        <IconSearch /> Search
      </div>
      <TabsList class="w-full mt-4">
        <TabsTrigger value="messages" class="flex:row-md">
          <IconChats class="w-4 h-4" />
          Messages
        </TabsTrigger>
        <TabsTrigger value="mentions" class="flex:row-md">
          <IconMention />
          Mentions
        </TabsTrigger>
        <TabsTrigger value="threads" class="flex:row-md">
          <IconReplies class="w-4 h-4" />
          Replies
        </TabsTrigger>
      </TabsList>
    </div>

    <TabsContent value="messages" class="flex:col flex-1">
      <InboxMessage
        v-for="channel of channels"
        :key="channel.id"
        :channel="channel"
        :can-join-meeting="!!channel.meeting && channel.meeting.id !== currentMeeting?.id"
        @join-meeting="joinMeeting(channel)"
        :open="channel.id === currentChannel?.id"
      />

      <div class="w-fit mt-4 mx-auto text-xs text-secondary-foreground">You have no more messages</div>
      <Dialog>
        <DialogTrigger as-child>
          <Button
            legacy
            legacy-variant="primary"
            legacy-size="sm"
            class="flex:row-md flex:center-y m-8 mt-auto ml-auto text-sm"
          >
            <IconChannel />
            Create Channel
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>Create channel</DialogHeader>
          <CreateChannel />
        </DialogContent>
      </Dialog>
    </TabsContent>
    <TabsContent value="mentions"></TabsContent>
    <TabsContent value="threads" class="flex:col flex-1">
      <div class="flex-1 overflow-y-auto">
        <div v-if="replyNotifications.length === 0" class="flex:col-md flex:center p-8 text-center">
          <IconReplies class="text-4xl text-secondary-foreground/50" />
          <div class="text-sm text-secondary-foreground">No replies yet</div>
        </div>

        <div v-else class="flex:col">
          <div
            v-for="(notification, index) in replyNotifications"
            :key="`${notification.payload.channelId}-${notification.payload.sender.id}-${notification.createdAt}-${index}`"
            class="flex:col-md p-4 border-b hover:bg-secondary transition-colors"
          >
            <ReplyNotification :payload="notification.payload" :createdAt="notification.createdAt" />
          </div>
        </div>
      </div>
    </TabsContent>
  </Tabs>
</template>
