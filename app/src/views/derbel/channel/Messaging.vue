<script lang="ts" setup>
import { useAuth } from "@/domain/auth";
import { useChannel } from "@/domain/channels";
import moment, { type Moment } from "moment";
import { onMounted, reactive, ref } from "vue";
import IconSendMessage from "../icons/IconSendMessage.vue";
import Scrollable from "./Scrollable.vue";

const { user: authUser } = useAuth();

const { messageGroups: messages, fetchMessages, joinChannel, sendMessage } = useChannel();

const message = reactive({ content: "" });
const messageTextEl = ref<HTMLElement | null>(null);

onMounted(async () => {
  joinChannel();
  fetchMessages();
});

async function onSendMessage() {
  if (!message.content) return;
  await sendMessage(message);
  message.content = "";
}

function formatDate(date: string | Moment) {
  return moment().startOf("day").isSame(moment(date).startOf("day"))
    ? moment(date).format("H:mm A")
    : moment(date).format("MMM DD");
}
</script>

<template>
  <Scrollable class="message-groups" ref="messagesEl">
    <div
      v-for="messageGroup of messages"
      :key="messageGroup.id"
      class="message-group flex gap gap-1.5"
      :class="{
        'self-end': messageGroup.senderId === authUser?.id,
        mine: messageGroup.senderId === authUser?.id,
      }"
    >
      <div class="message-photo"></div>
      <div class="messages">
        <div v-for="(message, i) of messageGroup.messages" :key="message.id" class="message">
          <template v-if="i === 0">
            <div class="flex justify-between gap-5">
              <small class="message-speaker">{{
                messageGroup.senderId === authUser?.id ? " You" : message.sender?.name
              }}</small>
              <small class="message-sent-at ml-auto">{{ formatDate(message.sentAt) }}</small>
            </div>
            <div class="message-text">{{ message.content }}</div>
          </template>
          <div v-else class="flex gap-2.5">
            <div class="message-text">{{ message.content }}</div>
            <small class="message-sent-at ml-auto">{{ formatDate(message.sentAt) }}</small>
          </div>
        </div>
      </div>
    </div>
  </Scrollable>
  <form @submit.prevent="onSendMessage" class="new-message" @click="messageTextEl?.focus()">
    <input v-model="message.content" placeholder="Type a message here..." ref="messageTextEl" />
    <button type="submit">
      <IconSendMessage />
    </button>
  </form>
</template>

<style scoped src="@/views/derbel/styles/main.css"></style>

<style scoped>
.message-groups {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  padding: 10px 10px;
  padding-right: 15px;
}

.message-groups::-webkit-scrollbar {
  width: 5px;
}

.message-groups::-webkit-scrollbar-thumb {
  background: #46464622;
  border-radius: 5px;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.message {
  display: flex;
  flex-direction: column;
  border-radius: 15px;
  background-color: #fff;

  gap: 10px;
  min-width: 220px;
  max-width: 680px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
  padding: 12px;
}

.message * {
  line-height: 100%;
}

.message-group.mine .message {
  border-top-right-radius: 5px;
  background: #d6e4e0;
  box-shadow: none;
}

.message-group:not(.mine) .message {
  border-top-left-radius: 5px;
}

.message-photo {
  width: 20px;
  height: 20px;
  background-color: #b2bdbd;
  border-radius: 40px;
}

.message-group.mine .message-photo {
  order: 1;
}

.message-speaker {
  font-size: 10px;
}

.message-sent-at {
  font-size: 10px;
  white-space: nowrap;
}

.message-text {
  font-size: 14px;
  line-height: 1.3;
}

.new-message {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: white;
  border-radius: 20px;
  padding: 10px;
  padding-left: 20px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 200ms;
}

.new-message:focus-within {
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
}

.new-message input {
  background-color: transparent;
  border: none;
  font-size: 14px;
  padding: 0;
  outline: none;
}

.new-message input::placeholder {
  color: #464646;
  font-size: 14px;
}

.new-message button {
  border: none;
  background-color: #252525;
  color: white;
  padding: 10px;
  font-size: 20px;
  border-radius: 50px;
}
</style>
