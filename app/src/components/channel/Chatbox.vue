<script lang="ts" setup>
import IconAcceptCall from "@/components/icons/IconAcceptCall.vue";
import { ScrollArea, Separator } from "@/design-system";
import type { IChannel, IMessageGroup } from "@/domain/channels";
import ChatboxTopbar from "./ChatboxTopbar.vue";
import Message from "./Message.vue";
import MessageGroup from "./MessageGroup.vue";
import MessageWriter from "./MessageWriter.vue";

const props = defineProps<{
  meId: number;
  chatTitle?: string;
  chatPicture?: string;
  messageGroups: IMessageGroup[];
  sendMessage: (message: { content: string; contentRich: any }) => Promise<void>;
  channelId: number;
  channel: IChannel;
}>();

const emit = defineEmits(["join-meeting", "more-details", "message-deleted"]);

async function onSendMessage(payload: { content: string; contentRich: any }) {
  if (!payload.content) return;
  await props.sendMessage(payload);
}

function onMessageDeleted(messageId: number) {
  emit("message-deleted", messageId);
}
</script>

<template>
  <div class="flex:col h-full">
    <ChatboxTopbar :chatTitle="chatTitle" :chatPicture="chatPicture" @more-details="emit('more-details')">
      <button @click="emit('join-meeting')" class="p-2 ml-auto border-none rounded-full bg-green">
        <IconAcceptCall />
      </button>
    </ChatboxTopbar>

    <Separator />

    <ScrollArea class="flex-1 min-h-0" bottom>
      <div class="flex:col-xl !flex justify-end p-4 min-h-full">
        <div class="flex:col-3xl p-xl mb-2xl">
          <div class="flex:row-xl flex:center-y gap-2">
            <img
              v-for="member of channel.peers"
              :key="member.id"
              :src="member.picture"
              class="w-18 h-18 -ml-10 first:ml-0 rounded-full"
            />
          </div>
          <div class="text-xl text-accent-foreground font-lato">
            This is the begining of a conversation between
            <template v-for="(member, i) of channel.peers" :key="member.id">
              <template v-if="i > 0 && i < channel.peers.length - 1">, </template>
              <template v-else-if="i > 0"> and </template>
              <span class="bg-[#c7f9ff] p-1 rounded-lg text-[#008194] font-bold">
                @{{ member.name }}
              </span> </template
            >.
          </div>
        </div>

        <MessageGroup
          v-for="group of messageGroups"
          :key="group.id"
          :sender="group.sender"
          :meId="meId"
          :sentAt="group.sentAt"
        >
          <Message
            v-for="message of group.messages"
            :key="message.id"
            :message
            :meId
            @message-deleted="onMessageDeleted"
          />
        </MessageGroup>
      </div>
    </ScrollArea>

    <div class="p-4">
      <MessageWriter :mentionables="channel.peers" :me-id="meId" @send-message="onSendMessage" />
    </div>
  </div>
</template>

<style scoped>
.bg-green {
  background-color: #57ca4d;
}
</style>
