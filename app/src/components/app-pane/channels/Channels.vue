<script setup lang="ts">
import daianaPhoto from "@/assets/images/daiana.png";
import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { Button, Dialog, DialogContent, DialogTrigger, Separator } from "@/design-system";
import { Icon, IconChannel, IconChats, IconMention, IconReplies } from "@/design-system/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/design-system/ui/tabs";
import { useAuth } from "@/domain/auth";
import { ChannelApi, useChannel, useMeeting, useSyncedChannels } from "@/domain/channels";
import type { IMessage } from "@/domain/channels/types";
import type { ReplyNotificationPayload } from "@/domain/notifications/types/notification.types";
import { useWorkspace } from "@/domain/workspace";
import { onMounted, onUnmounted, ref } from "vue";
import ReplyNotification from "../inbox/notifications/ReplyNotification.vue";
import CreateChannel from "./CreateChannel.vue";
import InboxMessage from "./InboxMessage.vue";

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
const replyNotifications = ref<ReplyNotificationItem[]>([
  {
    payload: {
      type: "reply",
      channelName: "channel-1",
      channelId: 1,
      message: "Hello, how are you?",
      sender: {
        id: 1,
        name: "John Doe",
        picture: daianaPhoto,
      },
    },
    createdAt: "2021-01-01T00:00:00.000Z",
  }
]);

async function onIncomingReply({
  reply,
  messageId,
  channelId,
}: {
  reply: IMessage;
  messageId: number;
  channelId: number;
}) {
  if (!user.value) return;

  // Don't show notifications for replies we sent ourselves
  if (reply.senderId === user.value.id) return;

  try {
    // Fetch all messages from the channel to find the parent message
    const messages = await channelApi.findMessages(channelId);
    const parentMessage = messages.find((m) => m.id === messageId);

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
          message: reply.content,
          sender: {
            id: reply.sender.id,
            name: reply.sender.name,
            picture: reply.sender.picture,
          },
        },
        createdAt: reply.sentAt,
      };

      // Check if notification already exists (avoid duplicates)
      const exists = replyNotifications.value.some(
        (n) =>
          n.payload.channelId === channelId &&
          n.payload.sender.id === reply.sender.id &&
          new Date(n.createdAt).getTime() === new Date(reply.sentAt).getTime(),
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

    <div class="flex:col">
      <div class="flex:row-auto flex:center-y h-14 p-4">
        <div class="flex:row-sm flex:center-y text-base text-foreground">
          <Icon name="fa-slack-hash" scale="1.2" />
          Channels
        </div>
      </div>

      <Separator />

      <TabsList class="w-fit mx-auto mb-2 mt-4">
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
      <div class="flex:col-md m-2">
        <InboxMessage v-for="channel of channels" :key="channel.id" :channel="channel"
          :can-join-meeting="!!channel.meeting && channel.meeting.id !== currentMeeting?.id"
          @join-meeting="joinMeeting(channel)" :open="channel.id === currentChannel?.id" />

        <div class="w-fit mt-4 mx-auto text-xs text-secondary-foreground">You have no more messages</div>
      </div>

      <Dialog>
        <DialogTrigger as-child>
          <Button legacy legacy-variant="primary" legacy-size="sm"
            class="flex:row-md flex:center-y m-8 mt-auto ml-auto text-sm">
            <IconChannel />
            Create Channel
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Create channel</DialogTitle>
          <CreateChannel />
        </DialogContent>
      </Dialog>
    </TabsContent>
    <TabsContent value="mentions"></TabsContent>
    <TabsContent value="threads" class="flex:col flex-1">
      <div class="flex-1 overflow-y-auto">
        <div v-if="replyNotifications.length <= 1" key="no-replies" class="flex:col-md flex:center p-8 text-center">
          <IconReplies class="text-4xl text-secondary-foreground/50" />
          <div class="text-sm text-secondary-foreground">No replies yet</div>
        </div>
        <TransitionGroup name="fade">
          <div v-if="replyNotifications.length > 1" key="replies" class="flex:col">
            <div v-for="(notification, index) in replyNotifications"
              :key="`${notification.payload.channelId}-${notification.payload.sender.id}-${notification.createdAt}-${index}`"
              class="flex:col-md p-4 border-b hover:bg-secondary transition-colors">
              <ReplyNotification :payload="notification.payload" :createdAt="notification.createdAt" />
            </div>
          </div>
        </TransitionGroup>
      </div>
    </TabsContent>
  </Tabs>
</template>

<style scoped>
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  /* transform: translateY(10px); */
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  /* transform: translateY(0); */
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
</style>