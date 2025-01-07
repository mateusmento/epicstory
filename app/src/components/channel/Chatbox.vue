<script lang="ts" setup>
import IconAcceptCall from "@/components/icons/IconAcceptCall.vue";
import Scrollable from "@/components/meeting/Scrollable.vue";
import { useChannel } from "@/domain/channels";
import { reactive } from "vue";
import ChatboxTopbar from "./ChatboxTopbar.vue";
import MessageBox from "./MessageBox.vue";
import MessageGroup from "./MessageGroup.vue";
import MessageWriter from "./MessageWriter.vue";
import type { IMessageGroup } from "./types";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";

defineProps<{
  meId: number;
  chatTitle?: string;
  chatPicture?: string;
  messageGroups: IMessageGroup[];
}>();

const emit = defineEmits(["join-meeting"]);

const { channel, sendMessage } = useChannel();

const message = reactive({ content: "" });

async function onSendMessage() {
  if (!message.content) return;
  await sendMessage(message);
  message.content = "";
}

const { viewContent } = useNavTrigger("details-pane");
</script>

<template>
  <div v-if="channel" class="flex:rows h-full">
    <ChatboxTopbar :chatTitle="chatTitle" :chatPicture="chatPicture" @more-details="viewContent('channel')">
      <button @click="emit('join-meeting')" class="p-2 ml-auto border-none rounded-full bg-green">
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
