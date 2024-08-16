<script lang="ts" setup>
import { useChannel, useMeeting } from "@/domain/channels";
import Scrollable from "@/views/derbel/channel/Scrollable.vue";
import IconAcceptCall from "@/views/derbel/icons/IconAcceptCall.vue";
import { reactive } from "vue";
import MessageGroup from "./MessageGroup.vue";
import MessageWriter from "./MessageWriter.vue";
import type { IMessageGroup } from "./types";

const props = defineProps<{
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
    <div class="topbar flex gap-2.5 border-b border-zinc-200">
      <img v-if="chatPicture" :src="chatPicture" class="channel-photo" />
      <div v-else class="channel-photos">
        <div class="channel-photo" style="background: #b2bdbd"></div>
        <div class="channel-photo" style="background: #ccc9c6"></div>
        <div class="channel-photo" style="background: #bcc2bc"></div>
      </div>

      <div class="channel-name">{{ chatTitle }}</div>

      <button
        @click="incomingMeeting ? joinIncomingMeeting() : channel && requestMeeting(channel.id)"
        class="p-2 ml-auto border-none rounded-full bg-green"
      >
        <IconAcceptCall />
      </button>
    </div>

    <Scrollable class="self:fill min-h-0">
      <div class="flex:rows-xl p-4">
        <MessageGroup
          v-for="group of messageGroups"
          :key="group.id"
          :sender="group.id === meId ? 'me' : 'someoneElse'"
          :message-group="group"
        >
          <MessageBox v-for="message of group.messages" :key="message.id" :message="message" />
        </MessageGroup>
      </div>
    </Scrollable>

    <div class="p-4">
      <MessageWriter v-model:mesage-content="message.content" @send-message="onSendMessage" />
    </div>
  </div>
</template>

<style scoped>
.channel {
  background-color: #f0f0f0;
  border-radius: 30px;
  padding: 10px;
}

.channel-photos {
  height: 40px;
  justify-content: flex-start;
  align-items: center;
  display: inline-flex;
}

.channel-photo {
  width: 40px;
  height: 40px;
  position: relative;
  border-radius: 20px;
}

.channel-photo:not(:first-of-type) {
  margin-left: -30px;
}

.channel-name {
  font-weight: 500;
  font-size: 16px;
}

.bg-green {
  background-color: #57ca4d;
}

.topbar {
  padding: 10px;
}

.close-btn {
  background: #f0f0f0;
}
</style>
