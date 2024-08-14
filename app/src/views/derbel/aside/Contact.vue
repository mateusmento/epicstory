<script lang="ts" setup>
import { useMeeting, type IChannel } from "@/domain/channels";
import moment, { type Moment } from "moment";
import IconAcceptCall from "../icons/IconAcceptCall.vue";

defineProps<{
  channel: IChannel;
  open: boolean;
  unreadMessages: boolean;
}>();

const emit = defineEmits(["join-meeting"]);

const { ongoingMeeting } = useMeeting();

function formatDate(date: string | Moment) {
  if (!date) return;
  return moment().startOf("day").isSame(moment(date).startOf("day"))
    ? moment(date).format("H:mm A")
    : moment(date).format("MMM D");
}
</script>

<template>
  <div class="channel" :class="{ open, 'unread-messages': unreadMessages }">
    <div class="channel-photo"></div>
    <div class="channel-info">
      <div class="flex justify-between items-baseline">
        <div class="channel-name line-fit">{{ channel.speakingTo.name }}</div>
        <small class="last-message-time line-fit">{{
          channel.lastMessage ? formatDate(channel.lastMessage.sentAt) : ""
        }}</small>
      </div>
      <small class="channel-last-message line-fit">{{ channel.lastMessage?.content }}</small>
    </div>
    <div v-if="channel.meeting && !ongoingMeeting" class="accept-call flex gap-5">
      <button @click.stop="emit('join-meeting')" class="p-2 border-none rounded-full bg-green-500">
        <IconAcceptCall />
      </button>
    </div>
  </div>
</template>

<style scoped src="@/views/derbel/styles/main.css"></style>

<style scoped>
.channel {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: 5px 15px 15px 15px;
  transition: background-color 100ms;
}

.channel.open,
.channel:hover {
  background-color: #e0e6e4;
}

.channel-photo {
  min-width: 30px;
  height: 30px;
  background-color: #b2bdbd;
  border-radius: 40px;
}

.channel-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 10px;
  margin-right: 5px;
  width: auto;
}

.channel-name {
  font-size: 15px;
}

.unread-messages .channel-name {
  font-weight: 500;
}

.channel-last-message {
  width: 200px;

  font-size: 14px;
  line-height: 16px;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.last-message-time {
  font-size: 10px;
}

small {
  font-size: 12px;
}

.accept-call {
  margin-block: auto;
}
</style>
