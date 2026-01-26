<script lang="ts" setup>
import IconAcceptCall from "@/components/icons/IconAcceptCall.vue";
import { ScrollArea } from "@/design-system";
import type { IChannel, IMessageGroup } from "@/domain/channels";
import { reactive } from "vue";
import ChatboxTopbar from "./ChatboxTopbar.vue";
import Message from "./Message.vue";
import MessageGroup from "./MessageGroup.vue";
import MessageWriter from "./MessageWriter.vue";

const props = defineProps<{
  meId: number;
  chatTitle?: string;
  chatPicture?: string;
  messageGroups: IMessageGroup[];
  sendMessage: (message: { content: string }) => Promise<void>;
  channelId: number;
  channel: IChannel;
}>();

const emit = defineEmits(["join-meeting", "more-details", "message-deleted"]);

const message = reactive({ content: "" });

async function onSendMessage() {
  if (!message.content) return;
  await props.sendMessage(message);
  message.content = "";
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

    <ScrollArea class="flex-1 min-h-0" bottom>
      <div class="flex:col-xl !flex justify-end h-full p-4">

        <div class="flex:col-3xl p-xl mb-2xl">
          <div class="flex:row-xl flex:center-y gap-2">
            <img v-for="member of channel.peers" :key="member.id" :src="member.picture"
              class="w-18 h-18 -ml-10 first:ml-0 rounded-full" />
          </div>
          <div class="text-xl text-accent-foreground font-lato">
            This is the begining of a conversation between
            <template v-for="(member, i) of channel.peers" :key="member.id">
              <template v-if="i > 0 && i < channel.peers.length - 1">, </template>
              <template v-else-if="i > 0"> and </template>
              <span class="bg-[#c7f9ff] p-1 rounded-lg text-[#008194] font-bold">
                @{{ member.name }}
              </span>
            </template>.
          </div>
        </div>

        <MessageGroup v-for="group of messageGroups" :key="group.id" :sender="group.sender" :meId="meId"
          :sentAt="group.sentAt">
          <Message v-for="(message, i) of group.messages" :key="message.id" :message
            @update:message="group.messages[i] = $event" :meId @message-deleted="onMessageDeleted" />
        </MessageGroup>
      </div>
    </ScrollArea>

    <div class="p-4">
      <MessageWriter v-model:message-content="message.content" @send-message="onSendMessage" />
    </div>
  </div>
</template>

<style scoped>
.bg-green {
  background-color: #57ca4d;
}
</style>
