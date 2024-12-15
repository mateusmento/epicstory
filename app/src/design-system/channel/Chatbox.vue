<script lang="ts" setup>
import { useChannel, useMeeting } from "@/domain/channels";
import Scrollable from "@/views/derbel/channel/Scrollable.vue";
import IconAcceptCall from "@/views/derbel/icons/IconAcceptCall.vue";
import { reactive } from "vue";
import ChatboxTopbar from "./ChatboxTopbar.vue";
import MessageGroup from "./MessageGroup.vue";
import MessageWriter from "./MessageWriter.vue";
import type { IMessageGroup } from "./types";
import MessageBox from "./MessageBox.vue";

defineProps<{
  meId: number;
  chatTitle?: string;
  chatPicture?: string;
  messageGroups: IMessageGroup[];
}>();

const { channel, sendMessage } = useChannel();

const { requestMeeting, joinIncomingMeeting, incomingMeeting } = useMeeting();

const message = reactive({ content: "" });

async function onSendMessage() {
  if (!message.content) return;
  await sendMessage(message);
  message.content = "";
}
</script>

<template>
  <div class="flex:rows h-full">
    <ChatboxTopbar :chatTitle="chatTitle" :chatPicture="chatPicture">
      <button
        @click="incomingMeeting ? joinIncomingMeeting() : channel && requestMeeting(channel.id)"
        class="p-2 ml-auto border-none rounded-full bg-green"
      >
        <IconAcceptCall />
      </button>
    </ChatboxTopbar>

    <Scrollable class="self:fill min-h-0">
      <div class="flex:rows-xl p-4">
        <MessageGroup
          v-for="group of messageGroups"
          :key="group.id"
          :sender="group.senderId === meId ? 'me' : 'someoneElse'"
          :message-group="group"
        >
          <MessageBox v-for="message of group.messages" :key="message.id" :content="message.content" />
        </MessageGroup>
      </div>
    </Scrollable>

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
